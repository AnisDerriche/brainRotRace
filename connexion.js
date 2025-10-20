const adresse = window.location.hostname; 
const port = window.location.port;        
const controller = "controller.html";     

const texte = port ? ` ${adresse}:${port}/${controller}` : `${adresse}/${controller}`;

document.getElementById("explications").textContent = texte;
