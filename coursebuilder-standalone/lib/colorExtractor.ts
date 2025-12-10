/**
 * Color Extraction Utility
 * Extracts dominant colors from logo images for brand theming
 */

export interface BrandColors {
  primary: string;      // Main brand color (used for headers, buttons)
  secondary: string;    // Accent color (used for highlights, progress bars)
  darkVariant: string;  // Darker shade for text and emphasis
  lightVariant: string; // Lighter shade for backgrounds
  textOnPrimary: string; // Text color to use on primary background
}

export interface LogoAnalysisResult {
  colors: BrandColors;
  dominantColors: string[];
  isValid: boolean;
  warnings: string[];
}

// Logo requirements and recommendations
export const LOGO_REQUIREMENTS = {
  recommendedFormats: ['PNG', 'SVG'],
  acceptedFormats: ['PNG', 'JPG', 'JPEG', 'SVG', 'WEBP'],
  maxFileSize: 2 * 1024 * 1024, // 2MB
  recommendedWidth: { min: 200, max: 800, ideal: 400 },
  recommendedHeight: { min: 50, max: 200, ideal: 100 },
  aspectRatio: { min: 2, max: 6, ideal: 4 }, // width:height ratio
  tips: [
    'Use PNG with transparent background for best results',
    'Horizontal/landscape logos work best (4:1 ratio ideal)',
    'Minimum 200px width for clarity',
    'Avoid logos with very light colors on white backgrounds',
    'Simple, bold colors extract better than gradients'
  ]
};

/**
 * Validates logo file before processing
 */
export function validateLogoFile(file: File): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check file type
  const extension = file.name.split('.').pop()?.toUpperCase() || '';
  if (!LOGO_REQUIREMENTS.acceptedFormats.includes(extension)) {
    errors.push(`Invalid format: ${extension}. Use PNG, JPG, SVG, or WEBP.`);
  } else if (!LOGO_REQUIREMENTS.recommendedFormats.includes(extension)) {
    warnings.push(`${extension} is acceptable, but PNG or SVG is recommended for best quality.`);
  }
  
  // Check file size
  if (file.size > LOGO_REQUIREMENTS.maxFileSize) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 2MB.`);
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validates logo dimensions after loading
 */
export function validateLogoDimensions(width: number, height: number): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const aspectRatio = width / height;
  
  if (width < LOGO_REQUIREMENTS.recommendedWidth.min) {
    warnings.push(`Logo width (${width}px) is below recommended minimum (${LOGO_REQUIREMENTS.recommendedWidth.min}px). May appear blurry.`);
  }
  
  if (width > LOGO_REQUIREMENTS.recommendedWidth.max) {
    warnings.push(`Logo width (${width}px) exceeds recommended maximum (${LOGO_REQUIREMENTS.recommendedWidth.max}px). Will be scaled down.`);
  }
  
  if (aspectRatio < LOGO_REQUIREMENTS.aspectRatio.min) {
    warnings.push(`Logo is too tall/square. Horizontal logos (4:1 ratio) work best in course headers.`);
  }
  
  if (aspectRatio > LOGO_REQUIREMENTS.aspectRatio.max) {
    warnings.push(`Logo is very wide. May be cropped in some views.`);
  }
  
  return { valid: true, warnings };
}

/**
 * Converts RGB to HSL for color analysis
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Converts HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * Converts RGB to hex color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculates relative luminance for contrast checking
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determines if text should be white or dark on a given background
 */
function getTextColorForBackground(r: number, g: number, b: number): string {
  const luminance = getLuminance(r, g, b);
  return luminance > 0.179 ? '#1f2937' : '#ffffff';
}

/**
 * Creates color variants from a base color
 */
function createColorVariants(r: number, g: number, b: number): { dark: string; light: string } {
  const hsl = rgbToHsl(r, g, b);
  
  // Dark variant: reduce lightness
  const darkHsl = { ...hsl, l: Math.max(hsl.l - 20, 15) };
  const darkRgb = hslToRgb(darkHsl.h, darkHsl.s, darkHsl.l);
  
  // Light variant: increase lightness, reduce saturation
  const lightHsl = { ...hsl, s: Math.max(hsl.s - 30, 10), l: Math.min(hsl.l + 35, 95) };
  const lightRgb = hslToRgb(lightHsl.h, lightHsl.s, lightHsl.l);
  
  return {
    dark: rgbToHex(darkRgb.r, darkRgb.g, darkRgb.b),
    light: rgbToHex(lightRgb.r, lightRgb.g, lightRgb.b)
  };
}

/**
 * Extracts dominant colors from an image using canvas
 */
export async function extractColorsFromImage(imageDataUrl: string): Promise<LogoAnalysisResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const warnings: string[] = [];
      
      // Validate dimensions
      const dimValidation = validateLogoDimensions(img.width, img.height);
      warnings.push(...dimValidation.warnings);
      
      // Create canvas for pixel analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({
          colors: getDefaultBrandColors(),
          dominantColors: [],
          isValid: false,
          warnings: ['Could not analyze image colors']
        });
        return;
      }
      
      // Scale down for faster processing
      const maxSize = 100;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Color frequency map
      const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        // Skip transparent/semi-transparent pixels
        if (a < 128) continue;
        
        // Skip near-white and near-black pixels
        const hsl = rgbToHsl(r, g, b);
        if (hsl.l > 90 || hsl.l < 10) continue;
        
        // Skip very low saturation (grays)
        if (hsl.s < 15) continue;
        
        // Quantize colors to reduce noise (group similar colors)
        const qr = Math.round(r / 16) * 16;
        const qg = Math.round(g / 16) * 16;
        const qb = Math.round(b / 16) * 16;
        const key = `${qr},${qg},${qb}`;
        
        const existing = colorMap.get(key);
        if (existing) {
          existing.count++;
          // Average the actual colors
          existing.r = Math.round((existing.r * (existing.count - 1) + r) / existing.count);
          existing.g = Math.round((existing.g * (existing.count - 1) + g) / existing.count);
          existing.b = Math.round((existing.b * (existing.count - 1) + b) / existing.count);
        } else {
          colorMap.set(key, { r, g, b, count: 1 });
        }
      }
      
      // Sort by frequency
      const sortedColors = Array.from(colorMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      if (sortedColors.length === 0) {
        warnings.push('No distinct colors found in logo. Using default brand colors.');
        resolve({
          colors: getDefaultBrandColors(),
          dominantColors: [],
          isValid: true,
          warnings
        });
        return;
      }
      
      // Primary color: most frequent
      const primary = sortedColors[0];
      const primaryHex = rgbToHex(primary.r, primary.g, primary.b);
      
      // Secondary color: find a contrasting color from top colors
      let secondary = sortedColors.length > 1 ? sortedColors[1] : primary;
      
      // Try to find a color with different hue for better contrast
      const primaryHsl = rgbToHsl(primary.r, primary.g, primary.b);
      for (const color of sortedColors.slice(1, 5)) {
        const colorHsl = rgbToHsl(color.r, color.g, color.b);
        const hueDiff = Math.abs(primaryHsl.h - colorHsl.h);
        if (hueDiff > 30 || hueDiff < 330) {
          secondary = color;
          break;
        }
      }
      
      const secondaryHex = rgbToHex(secondary.r, secondary.g, secondary.b);
      const variants = createColorVariants(primary.r, primary.g, primary.b);
      
      const dominantColors = sortedColors.slice(0, 5).map(c => rgbToHex(c.r, c.g, c.b));
      
      resolve({
        colors: {
          primary: primaryHex,
          secondary: secondaryHex,
          darkVariant: variants.dark,
          lightVariant: variants.light,
          textOnPrimary: getTextColorForBackground(primary.r, primary.g, primary.b)
        },
        dominantColors,
        isValid: true,
        warnings
      });
    };
    
    img.onerror = () => {
      resolve({
        colors: getDefaultBrandColors(),
        dominantColors: [],
        isValid: false,
        warnings: ['Failed to load image for color analysis']
      });
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * Returns default brand colors (Navigant Learning colors)
 */
export function getDefaultBrandColors(): BrandColors {
  return {
    primary: '#2E3192',      // Navy blue
    secondary: '#00C5B8',    // Cyan/teal
    darkVariant: '#1a1f5c',  // Dark navy
    lightVariant: '#e8eef5', // Light blue-gray
    textOnPrimary: '#ffffff'
  };
}

/**
 * Generates CSS variables string from brand colors
 */
export function generateCSSVariables(colors: BrandColors): string {
  return `
    --brand-navy: ${colors.primary};
    --brand-cyan: ${colors.secondary};
    --brand-dark-blue: ${colors.darkVariant};
    --brand-light: ${colors.lightVariant};
    --text-on-primary: ${colors.textOnPrimary};
  `;
}
