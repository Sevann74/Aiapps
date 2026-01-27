const fs = require('fs');

const filePath = './src/AICourseBuilderPortal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update the import to include deleteUser, setUserActive, getAllClients
const oldImport = "import { signIn, signOut, createUser, type UserProfile } from './lib/authService';";
const newImport = "import { signIn, signOut, createUser, deleteUser, setUserActive, getAllClients, type UserProfile } from './lib/authService';";
content = content.replace(oldImport, newImport);

// 2. Replace the delete button with disable + delete buttons
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
                      </button>`;

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
                      </button>`;

content = content.replace(oldDeleteButton, newButtons);

fs.writeFileSync(filePath, content);
console.log('✅ Updated AICourseBuilderPortal.tsx with delete and disable functionality');
