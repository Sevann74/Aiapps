const fs = require('fs');

const filePath = './src/AICourseBuilderPortal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update the import
content = content.replace(
  /import \{ signIn, signOut, createUser, type UserProfile \} from '\.\/lib\/authService';/,
  "import { signIn, signOut, createUser, deleteUser, setUserActive, getAllClients, type UserProfile } from './lib/authService';"
);

// 2. Replace localStorage clients with Supabase - use regex for flexible matching
const clientsPattern = /\/\/ Mock users database - load from localStorage\s+const \[clients, setClients\] = useState\(\(\) => \{[\s\S]*?\}\);\s+\/\/ Save clients to localStorage whenever they change\s+useEffect\(\(\) => \{\s+localStorage\.setItem\('coursebuilder_clients', JSON\.stringify\(clients\)\);\s+\}, \[clients\]\);/;

const newClientsCode = `// Clients state - loaded from Supabase
  const [clients, setClients] = useState<any[]>([]);
  
  // Load clients from Supabase on mount
  useEffect(() => {
    const loadClients = async () => {
      const result = await getAllClients();
      if (result.success && result.clients) {
        setClients(result.clients);
      }
    };
    if (isAuthenticated && currentUser?.role === 'admin') {
      loadClients();
    }
  }, [isAuthenticated, currentUser]);`;

content = content.replace(clientsPattern, newClientsCode);

// 3. Replace delete button - find the exact pattern and replace
const deleteButtonPattern = /<button\s+onClick=\{\(\) => \{\s+if \(confirm\(`Are you sure you want to delete \$\{client\.name\}\? This action cannot be undone\.`\)\) \{\s+setClients\(clients\.filter\(c => c\.id !== client\.id\)\);\s+alert\(`✅ Client \$\{client\.name\} has been deleted`\);\s+\}\s+\}\}\s+className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all text-sm"\s+>\s+Delete\s+<\/button>/;

const newButtonsCode = `<button
                        onClick={async () => {
                          const isCurrentlyActive = client.is_active !== false;
                          const action = isCurrentlyActive ? 'disable' : 'enable';
                          if (confirm(\`Are you sure you want to \${action} \${client.name}'s access?\`)) {
                            const result = await setUserActive(client.id, !isCurrentlyActive);
                            if (result.success) {
                              setClients(clients.map(c => c.id === client.id ? {...c, is_active: !isCurrentlyActive} : c));
                              alert(\`✅ Client \${client.name} has been \${action}d\`);
                            } else {
                              alert(\`❌ Failed to \${action} client: \${result.error}\`);
                            }
                          }
                        }}
                        className={\`px-4 py-2 \${client.is_active === false ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white font-semibold rounded-lg transition-all text-sm\`}
                      >
                        {client.is_active === false ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(\`Are you sure you want to permanently delete \${client.name}? This action cannot be undone.\`)) {
                            const result = await deleteUser(client.id);
                            if (result.success) {
                              setClients(clients.filter(c => c.id !== client.id));
                              alert(\`✅ Client \${client.name} has been deleted from the system\`);
                            } else {
                              alert(\`❌ Failed to delete client: \${result.error}\`);
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all text-sm"
                      >
                        Delete
                      </button>`;

content = content.replace(deleteButtonPattern, newButtonsCode);

fs.writeFileSync(filePath, content);

// Verify
const updated = fs.readFileSync(filePath, 'utf8');
console.log('=== Verification ===');
console.log('1. Import updated:', updated.includes('deleteUser, setUserActive, getAllClients') ? '✅' : '❌');
console.log('2. Clients from Supabase:', updated.includes('// Clients state - loaded from Supabase') ? '✅' : '❌');
console.log('3. Delete calls deleteUser:', updated.includes('await deleteUser(client.id)') ? '✅' : '❌');
console.log('4. Disable button added:', updated.includes('setUserActive(client.id') ? '✅' : '❌');
