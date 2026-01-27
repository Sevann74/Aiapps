const fs = require('fs');

const filePath = './src/AICourseBuilderPortal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update the import to include deleteUser, setUserActive, getAllClients
content = content.replace(
  "import { signIn, signOut, createUser, type UserProfile } from './lib/authService';",
  "import { signIn, signOut, createUser, deleteUser, setUserActive, getAllClients, type UserProfile } from './lib/authService';"
);

// 2. Replace localStorage-based clients with Supabase-based clients
const oldClientsInit = `  // Mock users database - load from localStorage
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('coursebuilder_clients');
    return saved ? JSON.parse(saved) : [
      {
        id: 'client-001',
        email: 'sarah@abcpharma.com',
        password: 'demo123',
        name: 'Sarah Johnson',
        role: 'client',
        organization: 'ABC Pharma',
        createdAt: new Date().toISOString()
      }
    ];
  });
  
  // Save clients to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('coursebuilder_clients', JSON.stringify(clients));
  }, [clients]);`;

const newClientsInit = `  // Clients state - loaded from Supabase
  const [clients, setClients] = useState<any[]>([]);
  
  // Load clients from Supabase on mount
  useEffect(() => {
    const loadClients = async () => {
      const result = await getAllClients();
      if (result.success && result.clients) {
        setClients(result.clients);
      }
    };
    loadClients();
  }, []);`;

content = content.replace(oldClientsInit, newClientsInit);

// 3. Replace the delete button with disable + delete buttons that call Supabase
const oldDeleteButton = `                      <button
                        onClick={() => {
                          if (confirm(\`Are you sure you want to delete \${client.name}? This action cannot be undone.\`)) {
                            setClients(clients.filter(c => c.id !== client.id));
                            alert(\`✅ Client \${client.name} has been deleted\`);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all text-sm"
                      >
                        Delete
                      </button>
                    </div>`;

const newButtons = `                      <button
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
                      </button>
                    </div>`;

content = content.replace(oldDeleteButton, newButtons);

fs.writeFileSync(filePath, content);

// Verify changes
const updatedContent = fs.readFileSync(filePath, 'utf8');
const hasNewImport = updatedContent.includes('deleteUser, setUserActive, getAllClients');
const hasSupabaseClients = updatedContent.includes('// Clients state - loaded from Supabase');
const hasNewButtons = updatedContent.includes('setUserActive(client.id');

console.log('=== Fix Results ===');
console.log('Import updated:', hasNewImport ? '✅' : '❌');
console.log('Clients from Supabase:', hasSupabaseClients ? '✅' : '❌');
console.log('Delete/Disable buttons:', hasNewButtons ? '✅' : '❌');

if (hasNewImport && hasSupabaseClients && hasNewButtons) {
  console.log('\n✅ All changes applied successfully!');
} else {
  console.log('\n⚠️ Some changes may not have been applied. Check the file manually.');
}
