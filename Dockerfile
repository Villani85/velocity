# COME VELOCITY VA IN RETE.
#
# Immagine di sola consegna: la build si fa qui fuori con `npm run build` e in
# questa immagine entra soltanto `dist/`. Costruire dentro il contenitore
# vorrebbe dire portarsi appresso node, i tipi e i quattro pacchetti di
# gltf-transform per servire dei file statici.
FROM nginx:alpine

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# LA 8080 E' OBBLIGATORIA. Cloud Run non guarda la 80: passa la porta
# nell'ambiente e si aspetta che il contenitore ascolti li', e se ascolti sulla
# 80 il deploy non fallisce con un errore chiaro — fallisce nel controllo di
# salute, che e' molto piu' difficile da leggere.
EXPOSE 8080
