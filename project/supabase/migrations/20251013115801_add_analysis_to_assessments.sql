/*
  # Add Analysis Field to Assessments Table

  1. Changes
    - Add `analysis` jsonb field to store generated analysis results
    - Add `analysis_generated_at` timestamp field to track when analysis was last generated

  2. Notes
    - Analysis field stores the complete analysis result from the analysis engine
    - Allows caching of analysis results to avoid regenerating on every view
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'analysis'
  ) THEN
    ALTER TABLE assessments ADD COLUMN analysis jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'analysis_generated_at'
  ) THEN
    ALTER TABLE assessments ADD COLUMN analysis_generated_at timestamptz DEFAULT NULL;
  END IF;
END $$;