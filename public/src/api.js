export async function api(path,options={}) {const response=await fetch('/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});const data=await response.json();if(!response.ok)throw new Error(data.error||'Falha de conexão');return data;}
export const post=(path,data)=>api(path,{method:'POST',body:JSON.stringify(data)});
