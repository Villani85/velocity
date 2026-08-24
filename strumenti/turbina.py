# -*- coding: utf-8 -*-
"""
LA TURBINA — il primo dei componenti che diventano luoghi.

L'IDEA CHE REGGE IL SITO (§14.4 di COSTRUZIONE.md): dentro la macchina non
galleggiano dei pezzi. CAMBIA LA SCALA. Una turbina diventa grande come una
stanza, una canalizzazione diventa un tunnel, un pistone diventa una torre. E
ogni componente e' un progetto: entrandoci, il materiale muta fino a
diventare il case study; uscendone, il progetto rientra fisicamente nella
macchina.

Quindi anche questo pezzo ha DUE LETTURE, come l'ottica del faro:

  a 1x   e' la girante di un turbocompressore da 62 mm: undici pale, ognuna
         svergolata di sessanta gradi dal mozzo alla punta.
  a 180x e' una sala circolare da undici metri, con undici setti radiali
         che si torcono salendo — cioe' un'architettura che non si potrebbe
         costruire ma che si legge come architettura.

PERCHE' PROPRIO UNA GIRANTE.

Perche' e' l'oggetto meccanico con la forma piu' difficile da confondere.
Chiunque abbia visto un motore la riconosce in un decimo di secondo, e non
somiglia a nient'altro: nessun altro pezzo ha quelle pale che si avvitano.
E' il contrario di quello che serviva per la corte — li' cercavo forme la cui
resa non dipendesse dall'abilita' di modellazione, qui cerco una forma
RICONOSCIBILE, perche' il suo mestiere e' dire «sei dentro un motore».

LA SVERGOLATURA E' TUTTO, ed e' anche la ragione per cui un generatore la
sbaglia sempre.

Una pala di girante non e' inclinata: e' TORTA. Al mozzo entra quasi
parallela all'asse, perche' li' la velocita' periferica e' bassa e l'aria
arriva dritta; alla punta e' quasi perpendicolare, perche' li' gira in fretta
e l'aria la incontra di traverso. L'angolo cambia con continuita' fra i due,
e quel cambio segue il RAPPORTO fra la velocita' dell'aria e quella della
pala — non una curva scelta a occhio.

Sessanta gradi di torsione fra mozzo e punta e' il valore vero di una girante
da automobile. Ed e' anche cio' che, ingrandito, produce quei setti che si
avvitano salendo: la cosa piu' bella dell'oggetto, e viene dalla fisica.

  exec(open(r'C:/.../strumenti/turbina.py', encoding='utf-8').read())
"""
import bpy
import bmesh
import math
from mathutils import Vector

MM = 0.001

# --- le misure di una girante da 62 mm ---------------------------------
R_PUNTA = 31 * MM          # raggio esterno
R_MOZZO_SU = 9 * MM        # raggio del mozzo in ingresso
R_MOZZO_GIU = 19 * MM      # raggio del mozzo in uscita: il mozzo si allarga
ALTEZZA = 26 * MM          # quanto e' profonda
N_PALE = 11                # undici: numero DISPARI apposta, vedi sotto
TORSIONE = math.radians(60)
SPESSORE = 1.1 * MM

# LA GHIERA che la contiene: e' quella che a 180x diventa il muro della sala
R_CASSA = 38 * MM
SPESSORE_CASSA = 4 * MM


def pulisci(prefisso='TURBINA_'):
    for o in list(bpy.data.objects):
        if o.name.startswith(prefisso):
            bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


def oggetto(nome, bm):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def profiloMozzo(t):
    """Il mozzo di una girante non e' un cono: e' una curva che parte stretta
    e si allarga accelerando. Con un cono l'aria si stacca; con questa curva
    resta attaccata — e a 180x la differenza fra i due e' quella fra un
    imbuto e una volta."""
    return R_MOZZO_SU + (R_MOZZO_GIU - R_MOZZO_SU) * (t ** 1.7)


def pala(bm, indice):
    """Una pala e' una superficie rigata: si costruisce come una scala di
    sezioni radiali, ognuna ruotata un po' piu' della precedente.

    PASSI: 14 in altezza, 9 in raggio. Non di piu': la pala e' sottile e
    curva, e infittire la griglia non aggiunge forma — aggiunge solo
    triangoli su una superficie che e' gia' liscia. La forma sta nella
    TORSIONE, che e' una funzione continua e non ha bisogno di campioni.
    """
    NA, NR = 14, 9
    base = 2 * math.pi * indice / N_PALE
    griglia = []
    for i in range(NA + 1):
        t = i / NA                       # 0 in cima (ingresso), 1 in fondo
        y = -ALTEZZA * t
        riga = []
        rm = profiloMozzo(t)
        for j in range(NR + 1):
            u = j / NR                   # 0 al mozzo, 1 alla punta
            r = rm + (R_PUNTA - rm) * u
            # LA TORSIONE CRESCE COL RAGGIO E CON LA PROFONDITA'.
            # Il termine in `u` e' quello vero della fisica: la pala si torce
            # perche' la velocita' periferica cresce col raggio. Il termine
            # in `t` e' la curvatura del canale, molto piu' debole.
            ang = base + TORSIONE * (u ** 1.25) + TORSIONE * 0.28 * t
            riga.append(bm.verts.new((math.cos(ang) * r, y, math.sin(ang) * r)))
        griglia.append(riga)
    for i in range(NA):
        for j in range(NR):
            bm.faces.new((griglia[i][j], griglia[i][j + 1],
                          griglia[i + 1][j + 1], griglia[i + 1][j]))
    return griglia


def girante():
    bm = bmesh.new()
    for k in range(N_PALE):
        pala(bm, k)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ob = oggetto('TURBINA_PALE', bm)
    # LE PALE HANNO UNO SPESSORE, e non e' un dettaglio: una pala a spessore
    # zero, vista di taglio, SPARISCE. E una girante la si guarda quasi sempre
    # di taglio, perche' le pale sono radiali e meta' di loro e' sempre di
    # profilo rispetto all'obiettivo.
    m = ob.modifiers.new('sp', 'SOLIDIFY')
    m.thickness = SPESSORE
    m.offset = 0
    dg = bpy.context.evaluated_depsgraph_get()
    ob.data = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    return ob


def mozzo():
    bm = bmesh.new()
    N, G = 18, 64
    anelli = []
    for i in range(N + 1):
        t = i / N
        r = profiloMozzo(t) - SPESSORE * 0.5
        y = -ALTEZZA * t
        anelli.append([bm.verts.new((math.cos(2 * math.pi * k / G) * r, y,
                                     math.sin(2 * math.pi * k / G) * r))
                       for k in range(G)])
    for i in range(N):
        for k in range(G):
            j = (k + 1) % G
            bm.faces.new((anelli[i][k], anelli[i][j], anelli[i + 1][j], anelli[i + 1][k]))
    bm.faces.new(anelli[0])
    bm.faces.new(list(reversed(anelli[-1])))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return oggetto('TURBINA_MOZZO', bm)


def cassa():
    """La chiocciola intorno. A 1x e' l'alluminio fuso del compressore; a 180x
    e' il muro della sala, con la sua cornice. Si vede DA DENTRO, quindi le
    normali guardano verso l'asse."""
    bm = bmesh.new()
    G = 64
    prof = [
        (R_CASSA, 6 * MM),
        (R_CASSA, -ALTEZZA - 6 * MM),
        (R_CASSA + SPESSORE_CASSA, -ALTEZZA - 6 * MM),
        (R_CASSA + SPESSORE_CASSA, 6 * MM),
    ]
    anelli = []
    for (r, y) in prof:
        anelli.append([bm.verts.new((math.cos(2 * math.pi * k / G) * r, y,
                                     math.sin(2 * math.pi * k / G) * r))
                       for k in range(G)])
    for i in range(len(anelli) - 1):
        for k in range(G):
            j = (k + 1) % G
            bm.faces.new((anelli[i][k], anelli[i][j], anelli[i + 1][j], anelli[i + 1][k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return oggetto('TURBINA_CASSA', bm)


def costruisci():
    pulisci()
    pezzi = [girante(), mozzo(), cassa()]
    tot = 0
    print('pezzo             vertici   facce')
    for o in pezzi:
        tot += len(o.data.polygons)
        print('%-17s %7d %7d' % (o.name, len(o.data.vertices), len(o.data.polygons)))
    print('TOTALE facce', tot, '(~%d triangoli)' % (tot * 2))
    print()
    print('LE DUE LETTURE')
    print('  a 1x   : girante diam %.0f mm, %d pale, torsione %.0f gradi'
          % (R_PUNTA * 2 / MM, N_PALE, math.degrees(TORSIONE)))
    print('  a 180x : sala diam %.1f m, %d setti radiali, alta %.1f m'
          % (R_PUNTA * 2 * 180, N_PALE, ALTEZZA * 180))
    print('  (undici metri e mezzo di luce con undici setti: e\' una sala')
    print('   capitolare. Se venissero due metri o cento, il pezzo non')
    print('   reggerebbe la seconda lettura e andrebbe rifatto.)')
    print()
    print('PERCHE\' UNDICI PALE E NON DODICI')
    print('  Un numero primo di pale non ha divisori in comune con il numero')
    print('  di pale della turbina a valle: e\' cosi\' che si evitano le')
    print('  risonanze, ed e\' il motivo per cui le giranti vere hanno quasi')
    print('  sempre un numero dispari. In piu\', ruotando, un numero dispari')
    print('  non presenta mai due pale allineate all\'obiettivo: il disegno')
    print('  non si chiude mai su se stesso e l\'occhio continua a leggerlo.')
    return pezzi


PEZZI = costruisci()
