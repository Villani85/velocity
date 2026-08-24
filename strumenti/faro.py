# -*- coding: utf-8 -*-
"""
L'OTTICA DEL FARO — il pezzo su cui si gioca tutto.

PERCHE' QUESTO OGGETTO E NON UN ALTRO.

Il momento con cui questo sito prova a battere `thewatch.60fps.fr` e' un
ATTRAVERSAMENTO: la camera arriva al faro, la lente riempie il quadro, si
continua a scorrere e si passa DENTRO il vetro. E li' dentro non ci sono
lampadine e plastica — c'e' un corridoio monumentale.

Quel corridoio non e' un'altra scena. E' LO STESSO OGGETTO, ingrandito.

E' l'unico modo di rispettare la regola 3 del progetto («nessuno stacco
percepibile»): se il corridoio fosse un modello diverso ci sarebbe per forza
un istante in cui uno sparisce e l'altro compare, e quell'istante e' un
taglio. Se invece e' lo stesso oggetto e cambia solo la scala, non c'e'
niente da nascondere, perche' non succede niente — si avvicina e basta.

QUINDI IL PEZZO HA DUE LETTURE, ED E' UN VINCOLO DI PROGETTO.

  a 1x, e' 104 mm di diametro: un modulo proiettore da hypercar, con la
  parabola, l'anello asferico, i gradini del riflettore e la guida di luce.

  a 200x, e' 21 metri: una galleria voltata lunga trentacinque metri, con le
  costolonature ogni 2,2 metri e un'abside luminosa in fondo.

Ogni misura qui sotto e' stata scelta perche' funzioni in TUTTE E DUE. E'
questo che rende il pezzo difficile e che lo rende il pezzo.

LA SEZIONE E' UNA SUPERELLISSE, e questa e' la decisione piu' importante.

Un proiettore vero e' un cilindro a sezione circolare. Ma in un cilindro non
si cammina: non ha un pavimento, e a 200x l'occhio non trova dove appoggiare
i piedi — legge come un tubo, non come un'architettura. Una superellisse con
esponente 2,6 e' un quadrato con gli angoli molto arrotondati: a 1x non si
distingue da un cerchio (nessuno guarda un proiettore da vicino cercando la
sezione), a 200x ha un pavimento, due pareti e una volta.

E' la stessa tecnica gia' pagata sul tubo catodico del progetto precedente,
dove serviva a passare da un frontale rettangolare a un collo circolare senza
una piega. Qui serve a far coesistere due letture invece di due estremi.

LE COSTOLONATURE, e perche' undici.

Sono i gradini del riflettore: in un proiettore servono a raccogliere la luce
che la parabola principale non prende. Ne servono pochi e profondi, non tanti
e fitti.

A 200x diventano gli archi della volta. Il passo e' 15,9 mm, cioe' 3,2 metri
ingranditi: e' l'interasse di una campata vera. Fitti il doppio sarebbero
scanalature; radi la meta' sarebbero anelli sciolti. Undici e' anche il
numero che riempie i 175 mm di canna lasciando la bocca e il fondo liberi,
che e' esattamente cio' che serve per far leggere un ingresso e un'abside.

  Si esegue da Blender (ponte MCP):
      exec(open(r'C:/.../strumenti/faro.py', encoding='utf-8').read())
"""
import bpy
import bmesh
import math
from mathutils import Vector

# ---------------------------------------------------------------- misure
# tutte in metri, alla scala vera dell'automobile.
MM = 0.001

CANNA_R = 52 * MM          # raggio esterno della canna
CANNA_SPESSORE = 6 * MM
CANNA_Y0 = 0.0             # la bocca, verso il davanti dell'auto
CANNA_Y1 = 175 * MM        # il fondo, dove sta la parabola
N_COSTE = 11
COSTA_SPORGENZA = 5.4 * MM  # quanto rientra ogni gradino
COSTA_SPESSORE = 6.2 * MM   # quanto e' "alta" lungo l'asse
ESPONENTE = 2.6             # superellisse: 2 = ellisse, 4 = quasi rettangolo
GIRO = 64                   # segmenti sul giro

BOCCA_R = 62 * MM           # l'imbuto d'ingresso si allarga
BOCCA_Y = -26 * MM

ANELLO_R_INT = 44 * MM      # l'anello asferico: la lente spessa del proiettore
ANELLO_R_EST = 58 * MM
ANELLO_Y = -14 * MM
ANELLO_SPESSORE = 13 * MM

PARABOLA_Y = CANNA_Y1
PARABOLA_PROF = 46 * MM

LENTE_R = 76 * MM           # la calotta esterna, quella che si attraversa
LENTE_Y = -48 * MM
LENTE_FRECCIA = 17 * MM

# 3,2 mm e non 5,2. A 5,2 il tondino era spesso il 7,5% del diametro
# dell'ottica e nel provino legge come un ANELLO AL NEON applicato sopra il
# muso, non come una firma incisa. Una guida di luce vera e' sottile: e' un
# filo di acrilico dentro una gola, e la sua forza sta nella continuita' del
# tratto, non nel suo spessore.
GUIDA_R = 3.2 * MM          # la guida di luce, la firma luminosa
GUIDA_GIRO_R = 69 * MM


def pulisci():
    """Tutto quello che si crea dentro il ciclo va tolto all'inizio del giro
    dopo: se no la seconda esecuzione trova i pezzi della prima e li somma,
    e il conteggio dei triangoli mente."""
    for o in list(bpy.data.objects):
        if o.name.startswith('FARO_'):
            bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


def superellisse(r, n, giro=GIRO):
    """n=2 e' un cerchio; n=2,6 e' un quadrato con angoli molto arrotondati.

    La formula tiene il segno separato dalla potenza: |cos|^(2/n) perde il
    segno, e senza rimetterlo la sezione collassa in un quarto di giro. E' un
    errore muto — non da' nessun avviso, produce solo una forma sbagliata.
    """
    p = []
    for i in range(giro):
        t = 2.0 * math.pi * i / giro
        c, s = math.cos(t), math.sin(t)
        x = math.copysign(abs(c) ** (2.0 / n), c) * r
        z = math.copysign(abs(s) ** (2.0 / n), s) * r
        p.append((x, z))
    return p


def orienta(bm, verso, campione=None):
    """Salda, ricalcola e SCEGLIE da che parte guardano le normali,
    misurandolo su una faccia nota invece di sperarci.

    La saldatura in cima non e' un di piu': senza, due anelli generati da due
    chiamate diverse condividono la posizione ma non i vertici, Blender
    orienta ogni isola per conto suo e il solido esce a facce alterne. E' lo
    stesso difetto che sul mobile del CRT aveva prodotto un booleano che non
    tagliava niente, in silenzio.
    """
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if campione is None:
        return
    rif = min(bm.faces, key=lambda f: (f.calc_center_median() - Vector(campione)).length)
    if rif.normal.dot(Vector(verso)) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])


def anello(bm, punti, y):
    return [bm.verts.new((x, y, z)) for (x, z) in punti]


def ponte(bm, a, b):
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))


def chiudi(bm, anellov):
    bm.faces.new(anellov)


def oggetto(nome, bm):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# =====================================================================
# 1. LA CANNA — il corridoio.
# =====================================================================
def canna():
    """Il profilo si costruisce come una lista di STAZIONI (y, raggio):
    prima si dichiara la sagoma, poi la si estrude. Cosi' la stessa lista
    serve anche a chi verifica, ed e' la lezione del tubo catodico —
    costruttore e verificatore devono leggere la stessa fonte.
    """
    tappe = []
    # l'imbuto: dalla bocca larga al diametro della canna
    tappe.append((BOCCA_Y, BOCCA_R))
    tappe.append((CANNA_Y0, CANNA_R))

    # LE COSTOLONATURE. Ogni gradino e' quattro stazioni: si entra, si
    # rientra di colpo, si corre dritti, si torna fuori. Il "di colpo" e' due
    # stazioni alla stessa y con raggi diversi — e' quello a produrre uno
    # spigolo vivo invece di uno smusso, e a 200x lo spigolo e' l'imposta
    # dell'arco.
    utile = CANNA_Y1 - CANNA_Y0 - 22 * MM
    passo = utile / N_COSTE
    y = CANNA_Y0 + 11 * MM
    for k in range(N_COSTE):
        # il raggio cala scendendo nella canna: un riflettore a gradini si
        # stringe verso il fuoco, e a 200x la galleria che si restringe
        # tira lo sguardo in fondo invece di lasciarlo galleggiare
        r = CANNA_R - COSTA_SPORGENZA * (0.35 + 0.65 * k / max(1, N_COSTE - 1))
        tappe.append((y, CANNA_R - 1.0 * MM))
        tappe.append((y, r))
        tappe.append((y + COSTA_SPESSORE, r))
        tappe.append((y + COSTA_SPESSORE, CANNA_R - 1.0 * MM))
        y += passo
    tappe.append((CANNA_Y1, CANNA_R - COSTA_SPORGENZA))

    bm = bmesh.new()
    anelli = []
    for (yy, rr) in tappe:
        # l'esponente scende verso il fondo: la bocca e' piu' squadrata (a
        # 200x e' un portale), il fondo piu' tondo (a 200x e' un'abside)
        t = (yy - BOCCA_Y) / (CANNA_Y1 - BOCCA_Y)
        n = ESPONENTE - 0.5 * max(0.0, min(1.0, t))
        anelli.append(anello(bm, superellisse(rr, n), yy))
    for i in range(len(anelli) - 1):
        ponte(bm, anelli[i], anelli[i + 1])
    orienta(bm, (0, 0, -1), (0, CANNA_Y0 + 0.05, -CANNA_R))
    # la canna si guarda DA DENTRO: la camera ci passa attraverso, quindi le
    # normali devono puntare verso l'asse. Senza questo il corridoio e'
    # invisibile dall'interno e si vede il cielo attraverso l'auto.
    return oggetto('FARO_CANNA', bm), tappe


# =====================================================================
# 2. LA PARABOLA — l'abside in fondo.
# =====================================================================
def parabola():
    bm = bmesh.new()
    passi = 14
    anelli = []
    r0 = CANNA_R - COSTA_SPORGENZA
    for i in range(passi + 1):
        t = i / passi
        # una parabola vera: la profondita' va col quadrato del raggio. Non e'
        # pedanteria — una calotta sferica riflette in modo diverso e a 200x
        # la differenza fra una volta parabolica e una sferica si vede.
        r = r0 * math.sqrt(max(0.0, 1.0 - t))
        y = PARABOLA_Y + PARABOLA_PROF * t
        if r < 1.5 * MM:
            r = 1.5 * MM
        anelli.append(anello(bm, superellisse(r, 2.1), y))
    for i in range(len(anelli) - 1):
        ponte(bm, anelli[i], anelli[i + 1])
    chiudi(bm, anelli[-1])
    orienta(bm, (0, -1, 0), (0, PARABOLA_Y + PARABOLA_PROF, 0))
    return oggetto('FARO_PARABOLA', bm)


# =====================================================================
# 3. L'ANELLO ASFERICO — la lente spessa, e il portale.
# =====================================================================
def anello_asferico():
    bm = bmesh.new()
    est_a = anello(bm, superellisse(ANELLO_R_EST, 2.2), ANELLO_Y)
    est_b = anello(bm, superellisse(ANELLO_R_EST, 2.2), ANELLO_Y + ANELLO_SPESSORE)
    int_a = anello(bm, superellisse(ANELLO_R_INT, 2.4), ANELLO_Y)
    int_b = anello(bm, superellisse(ANELLO_R_INT, 2.4), ANELLO_Y + ANELLO_SPESSORE)
    ponte(bm, est_a, est_b)
    ponte(bm, int_b, int_a)
    ponte(bm, int_a, est_a)
    ponte(bm, est_b, int_b)
    orienta(bm, (0, 0, 1), (0, ANELLO_Y + ANELLO_SPESSORE / 2, ANELLO_R_EST))
    return oggetto('FARO_ANELLO', bm)


# =====================================================================
# 4. LA CALOTTA — il vetro che si attraversa.
# =====================================================================
def calotta():
    """La superficie che la camera buca. E' una calotta molto piatta: la
    freccia e' 17 mm su 76 di raggio, cioe' un raggio di curvatura di 178 mm.

    Serve piatta per una ragione di regia: piu' e' curva, piu' il riflesso
    dell'architettura ci scorre sopra in fretta mentre la camera si avvicina,
    e l'avvicinamento sembra veloce. Piatta, il riflesso resta a lungo e
    l'ingresso ha peso.
    """
    bm = bmesh.new()
    passi = 12
    anelli = []
    for i in range(passi + 1):
        t = i / passi
        r = LENTE_R * math.sqrt(max(1e-4, 1.0 - t * t)) if t < 1 else 1.0 * MM
        y = LENTE_Y - LENTE_FRECCIA * (1.0 - t * t) * -1.0
        y = LENTE_Y + LENTE_FRECCIA * (t * t - 1.0) * -1.0
        anelli.append(anello(bm, superellisse(max(r, 1.0 * MM), 2.5), y))
    for i in range(len(anelli) - 1):
        ponte(bm, anelli[i], anelli[i + 1])
    chiudi(bm, anelli[-1])
    orienta(bm, (0, -1, 0), (0, LENTE_Y - LENTE_FRECCIA, 0))
    return oggetto('FARO_CALOTTA', bm)


# =====================================================================
# 5. LA GUIDA DI LUCE — la firma.
# =====================================================================
def guida():
    """Un tondino di acrilico che gira intorno alla bocca. E' la parte del
    faro che si riconosce da lontano ed e' l'unica che sta ACCESA di giorno.

    Qui fa un secondo mestiere: a 200x diventa un anello luminoso largo
    ventisette metri intorno all'ingresso della galleria. E' il segnale che
    dice «si passa di qui» senza scriverlo.
    """
    bm = bmesh.new()
    sezioni = []
    lungo = superellisse(GUIDA_GIRO_R, 2.5, GIRO)
    for i, (x, z) in enumerate(lungo):
        t = 2.0 * math.pi * i / len(lungo)
        # la normale del percorso, per orientare la sezione tonda
        nx, nz = math.cos(t), math.sin(t)
        cerchio = []
        for k in range(10):
            a = 2.0 * math.pi * k / 10
            cerchio.append(bm.verts.new((
                x + nx * GUIDA_R * math.cos(a),
                BOCCA_Y + 4 * MM + GUIDA_R * math.sin(a),
                z + nz * GUIDA_R * math.cos(a),
            )))
        sezioni.append(cerchio)
    for i in range(len(sezioni)):
        ponte(bm, sezioni[i], sezioni[(i + 1) % len(sezioni)])
    orienta(bm, (0, 0, 1), (0, BOCCA_Y + 4 * MM, GUIDA_GIRO_R + GUIDA_R))
    return oggetto('FARO_GUIDA', bm)


# =====================================================================
def costruisci():
    pulisci()
    c, tappe = canna()
    pezzi = [c, parabola(), anello_asferico(), calotta(), guida()]

    tot = 0
    print('pezzo               vertici  facce   ingombro (mm)')
    for o in pezzi:
        me = o.data
        b = [Vector(v) for v in o.bound_box]
        mn = Vector((min(v.x for v in b), min(v.y for v in b), min(v.z for v in b)))
        mx = Vector((max(v.x for v in b), max(v.y for v in b), max(v.z for v in b)))
        d = (mx - mn) / MM
        tot += len(me.polygons)
        print('%-18s %7d %6d   %.0f x %.0f x %.0f' % (
            o.name, len(me.vertices), len(me.polygons), d.x, d.y, d.z))
    print('TOTALE facce:', tot, ' (quad, cioe\' circa', tot * 2, 'triangoli)')

    # LA VERIFICA CHE CONTA: le due letture.
    passo = (tappe[-1][0] - tappe[2][0]) / N_COSTE
    print()
    print('LE DUE LETTURE')
    print('  a 1x   : canna diam %.0f mm, lunga %.0f mm, coste ogni %.1f mm'
          % (CANNA_R * 2 / MM, (CANNA_Y1 - CANNA_Y0) / MM, passo / MM))
    print('  a 200x : galleria diam %.1f m, lunga %.1f m, campate ogni %.2f m'
          % (CANNA_R * 2 * 200, (CANNA_Y1 - BOCCA_Y) * 200, passo * 200))
    print('  (una campata da 3 metri e una volta da 20 sono misure vere:')
    print('   se venissero 40 cm o 80 metri, l\'oggetto non reggerebbe la')
    print('   seconda lettura e andrebbe rifatto, non ritoccato)')
    return pezzi


PEZZI = costruisci()
