# FRAME
## Production Management App — Complete Technical Document

**Version:** 0.3
**Status:** Core MVP Implemented

---

### Table of Contents

0. [Resoluciones de Implementación](#0-resoluciones-de-implementación-v03)
1. [Product Design Document](#1-product-design-document)
2. [Architecture Document](#2-architecture-document)
3. [Database Schema (Prisma)](#3-database-schema-prisma)

---

## 0. Resoluciones de Implementación (v0.3)

Contradicciones y vacíos detectados en la v0.2 al iniciar la implementación, con la resolución aplicada. **El schema fuente de verdad vive en `packages/db/prisma/schema.prisma`** — el borrador embebido en §3 se conserva como referencia histórica y difiere en los puntos marcados.

| # | Contradicción / vacío | Resolución aplicada |
|---|----------------------|---------------------|
| 1 | §1.1 decía Free "sin colaboradores"; §2.13 define `maxCollaborators: 3` | **3 colaboradores en Free** (el razonamiento de negocio de §2.13 gana). §1.1 corregido |
| 2 | §4.1 `Project.director/producer: ref → Person` no existían en el schema | **Se derivan de `Person`** por department/role (igual que el slate resuelve el DOP). Sin FK directa |
| 3 | §4.4 `Shot.location: ref → Location` no existía en el schema | **El shot hereda la locación de su `Scene`** |
| 4 | §4.6 `Task.assignedTo: ref → Person` vs borrador Prisma `assignedToId → User` | `personId → Person` (owner/inbox) + **múltiples asignados** vía junction `TaskAssignee` (task × Person) — el asignado no necesita login y una task puede tener varios responsables. `createdById → User` se mantiene |
| 5 | Scene.status con enum propio vs `ShotStatus` reutilizado | **Enum compartido `ShotStatus`** para Scene y Shot |
| 6 | §2.14 usa `exportsPerDay` pero §2.13 no lo definía | **Agregado**: 10 (Free) / 100 (Pro) / ∞ (Team) |
| 7 | `ProductionDay.status` era String en el borrador | **Enum `ProductionDayStatus`** (PLANNED, IN_PROGRESS, COMPLETED, POSTPONED) |
| 8 | `ScheduleBlock.locationId` sin relación Prisma | **Relación agregada** a `Location` |
| 9 | `Styling.projectId` sin relación; `Project` sin `stylings[]` | **Relación agregada** |
| 10 | §4.12 `Equipment.assignedTo` single Person vs m2m vía Crew | **m2m** (`PersonEquipment`) — más flexible |
| 11 | `ChangeEntry.userId` requerido pero seeds/sistema no tienen usuario | **`userId` nullable** — se muestra como "System" |
| 12 | §1.7 paleta SMPTE pura (`#FFFF00`…) vs mockups con paleta ajustada | **Paleta de los mockups** (`#EFC000`, `#00D4DE`, …) — mejor contraste. §1.7 corregido |
| 13 | Doc especificaba Next.js 14 | **Next.js 15 App Router** (estable actual) |

**Alcance implementado (núcleo MVP):** monorepo Turborepo/pnpm, schema Prisma completo, API Hono+tRPC (auth Supabase, permisos, plan limits, changelog automático), UI de Dashboard/Shotlist/Personas+Tasks/Locaciones/Props/Equipment/Production Days/Changelog/Settings, exports Call Sheet PDF y Shot List PDF/CSV. **Diferido:** guión TipTap, moodboard, stylings UI, slate generator, BullMQ+Redis, realtime, RLS, rate limiting.

---

## 1. Product Design Document

### 1.1 Visión General

**FRAME** es una aplicación web para gestión integral de producciones audiovisuales, diseñada para acompañar todo el ciclo de vida de un proyecto: desde la conceptualización y preproducción hasta el wrap y la entrega en postproducción.

El diferencial frente a herramientas existentes (StudioBinder, Celtx, Shot Designer) es la profundidad del modelo de datos relacionales, la flexibilidad de los editores de contenido y un sistema de trazabilidad total de cambios — todo combinado en una sola herramienta cohesionada y sin fricción.

### Modelo de Negocio: Freemium

| Tier | Alcance |
|------|---------|
| **Free** | 1 proyecto activo, límites en assets, sin exportaciones avanzadas, hasta 3 colaboradores |
| **Pro** | Proyectos ilimitados, todas las exportaciones, hasta N colaboradores |
| **Team** | Todo lo anterior + permisos granulares, historial extendido, concurrencia real |

---

### 1.2 Usuarios Objetivo

| Rol | Descripción |
|-----|-------------|
| **Director / Productor** | Usuario primario / Admin del proyecto. Define la visión, configura permisos, aprueba el shotlist. |
| **1er AD (Asistente de Dirección)** | Construye y administra el call sheet y los timings del día. |
| **Director de Fotografía** | Revisa y edita el shotlist: equipo, planos, movimientos, referencias visuales. |
| **Coordinador de Producción** | Gestiona locaciones, logística, props y talentos. |
| **Stylist / Wardrobe** | Consulta y actualiza stylings por escena y personaje. |
| **Editor / Post** | Consulta el shotlist, registra qué se grabó, agrega notas de postproducción, gestiona sus tasks. |

---

### 1.3 Módulos Principales

```
FRAME
├── 1. Proyecto
├── 2. Guión
├── 3. Shotlist Maestra
├── 4. Personas & Tasks
├── 5. Locaciones
├── 6. Stylings & Looks
├── 7. Props
├── 8. Equipo Técnico
├── 9. Producción (Timings, Call Sheet, Schedule)
├── 10. Claqueta
└── 11. Exportaciones
```

---

### 1.4 Modelo de Datos

### 4.1 Proyecto (`Project`)

Entidad raíz. Todo lo demás existe dentro de un proyecto.

```
Project
├── title: string
├── type: enum (commercial, music_video, short_film, feature_film, documentary, content)
├── client?: string
├── brand?: string
├── director: derivado → Person con department DIRECTION + role "Director" (sin FK — ver §0.2)
├── producer: derivado → Person con department PRODUCTION + role "Producer" (sin FK — ver §0.2)
├── description: RichText
├── moodboard: MoodboardBoard (ver §4.10)
├── status: enum (development, pre_production, production, post_production, delivered)
├── shootDates: DateRange[]
├── members: ProjectMember[] → { ref: Person, projectRole: string, permissions: PermissionSet }
├── creationSource: enum (blank, demo_template, cloned_project)
│   blank: proyecto vacío
│   demo_template: copia de la plantilla demo global (datos precargados que hacen showcase de todas las features)
│   cloned_project: duplicado de un proyecto propio anterior
├── clonedFromId?: ref → Project (si fue clonado de proyecto propio)
└── createdAt / updatedAt
```

---

### 4.2 Historial de Cambios (`ChangeLog`) — Sistema Global

Presente en **todas las entidades** de la aplicación. No solo el shotlist.

```
ChangeEntry
├── entityType: string (e.g. "Shot", "Prop", "Person", "Scene"...)
├── entityId: ref → any
├── projectId: ref → Project
├── userId: ref → User
├── timestamp: DateTime
├── action: enum (created, updated, deleted, restored)
├── diff: JSONPatch (qué campo cambió, valor anterior, valor nuevo)
├── namedVersion?: string (nombre optativo, e.g. "Shotlist aprobada día 1")
└── note?: string (comentario del usuario sobre el cambio)
```

> Los usuarios pueden **nombrar un snapshot** del estado actual de cualquier entidad desde la UI, similar a los "Named Versions" de Google Docs. El historial continuo siempre existe en segundo plano.

---

### 4.3 Guión (`Script`)

```
Script
├── projectId: ref → Project
├── content: RichText (bloques estructurados)
│   ├── SceneHeading (INT. / EXT. — LUGAR — MOMENTO)
│   ├── Action
│   ├── Character
│   ├── Dialogue
│   ├── Parenthetical
│   └── Transition
├── linkedScenes: ref[] → Scene
└── changelog: ref[] → ChangeEntry
```

> Exporta en formato PDF estándar de industria (Courier 12pt, márgenes correctos). Cada bloque de escena se puede vincular a una Escena en la Shotlist Maestra.

---

### 4.4 Estructura Narrativa

Jerarquía: **Proyecto → Acto → Escena → Shot**

```
Act
├── projectId: ref → Project
├── number: int
├── title?: string
└── description?: RichText

Scene
├── actId: ref → Act
├── number: string (e.g. "1A", "2B")
├── title: string
├── synopsis: RichText
├── scriptRef?: ref → Script block
├── location: ref → Location
├── daylight: enum (dawn, morning, midday, afternoon, sunset, night, deep_night, studio)
├── estimatedDuration: Duration (minutos)
├── moodboard: MoodboardBoard (ver §4.10)
├── status: enum (not_filmed, filmed, approved, discarded)
└── notes: RichText

Shot
├── sceneId: ref → Scene
├── shotNumber: string (e.g. "1A-03")
├── shotName: string
├── description: RichText
├── referenceImages: Asset[] ← NUEVO
│
│ — CAMERA —
├── frameSize: enum (ECU, CU, MCU, MS, MLS, LS, ELS, aerial, POV, OTS, two_shot, insert...)
├── lensSize?: string (e.g. "50mm", "35mm")
├── cameraMovement: enum[] (static, pan, tilt, dolly, steadicam, handheld, drone, crane, zoom, push_in, pull_out...)
├── cameraAngle: enum (eye_level, high_angle, low_angle, dutch, birds_eye, worms_eye)
├── equipment: ref[] → Equipment
│
│ — CONTENT —
├── people: ShotPerson[] → { ref: Person, role: string, action: string, emotion: string }
├── styling: ref[] → Styling
├── props: ref[] → Prop
├── location: heredada de Scene.location (sin FK propia — ver §0.3)
│
│ — AUDIO / POST —
├── voiceover?: RichText
├── soundEffects?: string[]
├── musicRef?: string
│
│ — PRODUCTION —
├── estimatedDuration: Duration (segundos)
├── filmed: boolean
├── takes?: int
├── selectedTake?: int
├── postNotes?: RichText
├── slate: SlateConfig (ver §4.11)
└── notes?: RichText
```

---

### 4.5 Personas (`Person`) — Modelo Polimórfico

```
Person (abstract)
├── id
├── name: string
├── profilePhoto?: Asset
├── email?: string
├── phone?: string
├── department: enum (direction, production, photography, art, makeup_hair, wardrobe, sound, post, talent, client, other)
├── role: string
├── callTime?: Time
├── tasks: Task[] (ver §4.6)
└── notes?: RichText
```

#### Subclases:

**`Talent`**
```
+ agencyName?: string
+ agencyContact?: string
+ characterName?: string
+ measurements?: { height, weight, sizes... }
+ portfolio?: url[]
+ availability: DaySchedule[]
```

**`Crew`**
```
+ crewType: enum (head_of_department, operator, assistant)
+ equipment?: ref[] → Equipment
+ vehicle?: string
```

**`PostCrew`**
```
+ deliverables: string[]
+ software: string[]
+ availability: DateRange[]
```

**`Client`**
```
+ companyName: string
+ position?: string
+ approvalRequired: boolean
```

---

### 4.6 Tasks (`Task`) — Sistema Subyacente por Persona

Cada `Person` tiene asociado un listado de tasks. Las tasks pueden crearse manualmente o generarse automáticamente (e.g. al asignar un prop a alguien, se puede crear un task "Confirmar disponibilidad de prop X").

```
Task
├── personRef: ref → Person
├── projectId: ref → Project
├── title: string
├── description?: RichText
├── status: enum (pending, in_progress, done, blocked, cancelled)
├── priority: enum (low, medium, high, urgent)
├── dueDate?: Date
├── linkedEntity?: { entityType: string, entityId: ref }
│   (e.g. { entityType: "Prop", entityId: "prop_123" })
│   (e.g. { entityType: "Location", entityId: "loc_456" })
├── createdBy: ref → User
├── assignedTo: ref → Person (puede diferir del owner)
└── changelog: ref[] → ChangeEntry
```

> La vista de tasks de cada persona actúa como su inbox operativo dentro del proyecto. Un coordinador puede asignar tasks a props, locaciones, stylings, etc. y el responsable ve todo centralizado en su perfil.

---

### 4.7 Locaciones (`Location`)

```
Location
├── name: string
├── type: enum (interior, exterior, studio, natural, urban, rural, water, other)
├── address?: string
├── coordinates?: GeoPoint
├── contactName?: string
├── contactPhone?: string
├── permitRequired: boolean
├── permitStatus?: enum (not_required, pending, in_process, obtained)
├── photos: Asset[]
├── scoutingNotes: RichText
├── accessNotes?: RichText
├── powerAvailable: boolean
├── amenities?: string[]
├── availableDates?: DateRange[]
└── tasks: ref[] → Task (e.g. "Confirmar permiso", "Recorrido de scouting")
```

---

### 4.8 Styling & Looks (`Styling`)

Un Styling es específico a una combinación **personaje × escena(s)**.

```
Styling
├── characterRef: ref → Person (Talent)
├── sceneRefs: ref[] → Scene
├── lookName: string (e.g. "Look 1 — Oficina")
├── description: RichText
├── referenceImages: Asset[]
├── garments: Garment[]
│   ├── item: string
│   ├── brand?: string
│   ├── color: string
│   ├── size?: string
│   ├── status: enum (confirmed, searching, on_loan, purchased)
│   └── photo?: Asset
├── accessories: Accessory[] (misma estructura)
├── hairRef?: { description: RichText, images: Asset[] }
├── makeupRef?: { description: RichText, images: Asset[] }
└── notes?: RichText
```

---

### 4.9 Props (`Prop`)

```
Prop
├── name: string
├── description?: RichText
├── referenceImages: Asset[]
├── category: enum (prop, set_dressing, vehicle, food, weapon, document, tech, other)
├── quantity: int
├── status: enum (searching, in_fabrication, confirmed, in_storage, on_set, returned) ← ACTUALIZADO
├── source?: enum (own, rented, purchased, borrowed)
├── sourceName?: string
├── cost?: number
├── sceneRefs: ref[] → Scene
├── shotRefs: ref[] → Shot
├── tasks: ref[] → Task
└── notes?: RichText
```

---

### 4.10 Moodboard (`MoodboardBoard`)

Tipo de dato reutilizable, embebido en `Project` y en `Scene`.

```
MoodboardBoard
├── ownerId: ref → Project | Scene
├── title?: string
├── items: MoodboardItem[]
│   ├── id
│   ├── type: enum (image, video_ref, color_swatch, text_note, url_embed)
│   ├── asset?: Asset (para image)
│   ├── color?: HexColor (para color_swatch)
│   ├── content?: string (para text_note o url)
│   ├── caption?: string
│   ├── position: { x, y } (layout libre tipo pin-board)
│   └── size: { w, h }
└── layout: enum (freeform, grid)
```

> La vista freeform permite drag & drop libre de imágenes (tipo PureRef lite). La vista grid organiza automáticamente.

---

### 4.11 Claqueta (`SlateConfig` + `SlateGenerator`)

Cada Shot tiene una `SlateConfig` que define qué campos se muestran en la claqueta y con qué valores. El sistema auto-popula desde los datos del shot y permite overrides.

```
SlateConfig (embebido en Shot)
├── enabled: boolean
├── fields: SlateField[]
│   Cada SlateField:
│   ├── fieldKey: enum (production, director, dop, date, scene, shot, take, roll, camera, lens, filter, fps, format, custom)
│   ├── label: string (label visible en la claqueta)
│   ├── valueSource: enum (auto, manual)
│   │   auto: toma el valor desde el dato vinculado en el shot/proyecto
│   │   manual: el usuario escribe el valor libremente
│   ├── autoRef?: string (qué campo del modelo usar, e.g. "project.director.name", "shot.lensSize")
│   └── manualValue?: string
└── layout: enum (standard, minimal, custom)
```

```
SlateGenerator (utility, no entidad de BD)
├── input: ref → Shot
├── output: SlateDocument
│   ├── fields: { label: string, value: string }[]
│   ├── format: enum (printable_pdf, on_screen_overlay, image_png)
│   └── generatedAt: DateTime
```

**Campos estándar de claqueta que se auto-populan:**

| Campo | Fuente automática |
|-------|------------------|
| Production | `project.title` |
| Director | `project.director.name` |
| D.O.P. | persona del proyecto con rol "Director de Fotografía" |
| Date | `productionDay.date` |
| Scene | `shot.sceneId → scene.number` |
| Shot | `shot.shotNumber` |
| Take | `shot.takes` (incrementa por rodaje) |
| Camera | `shot.equipment` (filtrado por tipo cámara) |
| Lens | `shot.lensSize` |
| FPS | campo manual o del proyecto |

> La UI del generador de claqueta es una vista preview en tiempo real donde el usuario puede activar/desactivar campos, cambiar labels y ver el resultado antes de generar. Exporta como PDF imprimible o PNG de overlay para postproducción.

---

### 4.12 Equipo Técnico (`Equipment`)

```
Equipment
├── name: string
├── type: enum (camera, lens, steadicam, slider, drone, lighting, sound, grip, other)
├── brand?: string
├── model?: string
├── serialNumber?: string
├── rentalSource?: string
├── availableDates?: DateRange[]
├── assignedTo?: ref → Person
└── notes?: string
```

---

### 4.13 Producción: Día de Rodaje (`ProductionDay`)

```
ProductionDay
├── projectId: ref → Project
├── date: Date
├── generalCallTime: Time
├── locations: ref[] → Location
│
├── crewCallTimes: CrewCall[]
│   ├── personRef?: ref → Person
│   ├── department?: enum Department
│   └── callTime: Time
│
├── schedule: ScheduleBlock[]
│   ├── startTime: Time
│   ├── endTime: Time
│   ├── type: enum (setup, shooting, catering, break, wardrobe_change, travel, pickup, wrap, other)
│   ├── label: string
│   ├── parallel: boolean ← eventos en paralelo comparten el mismo slot de tiempo
│   ├── parallelGroupId?: string ← agrupa bloques que ocurren simultáneamente
│   ├── shotRefs?: ref[] → Shot
│   ├── locationRef?: ref → Location
│   └── notes?: string
│
├── talentCallTimes: TalentCall[]
│   ├── personRef: ref → Person (Talent)
│   ├── callTime: Time
│   ├── makeupCallTime?: Time
│   ├── onSetTime?: Time
│   └── wrapTime?: Time
│
├── generalNotes?: RichText
└── status: enum (planned, in_progress, completed, postponed)
```

> Los `ScheduleBlock` con `parallel: true` se renderizan en columnas lado a lado en la vista de timeline y en el production schedule exportado, para que sea legible aún con actividades simultáneas.

---

### 1.5 Permisos (`PermissionSet`)

Configurables por el admin del proyecto (Director/Productor) por cada `ProjectMember`.

```
PermissionSet
├── canEditScript: boolean
├── canEditShotlist: boolean
├── canEditCameraData: boolean (frameSize, lens, movements)
├── canEditSchedule: boolean
├── canEditPeople: boolean
├── canEditLocations: boolean
├── canEditStyling: boolean
├── canEditProps: boolean
├── canExport: boolean
├── canManageMembers: boolean
└── isAdmin: boolean (override total)
```

---

### 1.6 Exportaciones

| Documento | Descripción | Formato |
|-----------|-------------|---------|
| **Call Sheet** | Día de rodaje: call times, locación, schedule, contactos | PDF |
| **Shot List** | Lista maestra de shots con todos los campos relevantes | PDF / CSV |
| **Production Schedule** | Timeline completo con bloques en paralelo, por día o por proyecto | PDF |
| **Scene Breakdown** | Props, stylings, personas y equipo por escena | PDF |
| **Script** | Guión en formato estándar de industria | PDF |
| **Stripboard** | Vista de tiras por escena y día | PDF |
| **Talent Schedule** | Horario individual por talento | PDF |
| **Props List** | Listado general de utilería con estado | PDF / CSV |
| **Equipment List** | Listado de equipos y asignaciones | PDF / CSV |
| **Slate** | Claqueta por shot | PDF / PNG |

---

### 1.7 Diseño Visual — Dirección Estética

**Inspiración**: SMPTE Color Bars reinterpretadas en clave moderna y minimalista.

**Concepto**: La barra de color como sistema semántico. Cada módulo/estado/categoría tiene un color de la paleta SMPTE asignado, usado con intención y consistencia. Los colores no son decorativos — son información.

**Principios:**
- Fondo oscuro (near-black, no negro puro) como base. La oscuridad no intimida; es el set.
- Tipografía técnica y limpia. Monospace para datos de producción (números de shot, timecodes, datos de cámara). Sans-serif geométrico para UI general.
- Los colores SMPTE (blanco, amarillo, cian, verde, magenta, rojo, azul) se usan como chips de estado y acentos, nunca como fondos extensos.
- Densidad de información alta pero bien jerarquizada. Un DP tiene que poder leer el shotlist de un vistazo.
- Iconografía minimal y técnica, no ilustrativa.
- Animaciones sutiles, funcionales. Nada que compita con el contenido.

**Paleta base** (valores ajustados en la iteración de diseño — ver §0.12; los tonos SMPTE puros vibraban demasiado sobre fondo oscuro):
```
Background:   #0D0D0D (near-black)
Surface:      #1A1A1A
Border:       #2E2E2E
Text primary: #F0F0F0
Text muted:   #6B6B6B

SMPTE White:   #F0F0F0 → estado: approved / confirmed
SMPTE Yellow:  #EFC000 → estado: in_progress / on_set
SMPTE Cyan:    #00D4DE → cámara / fotografía
SMPTE Green:   #00C853 → audio / post
SMPTE Magenta: #CC00AA → styling / arte
SMPTE Red:     #FF3530 → urgente / bloqueado
SMPTE Blue:    #2860FF → producción / logística
```

---

### 1.8 UX & Navegación

### Dashboard del Proyecto
- % shots filmados, días restantes, tasks pendientes por área
- Acceso rápido a módulos activos
- Feed de actividad reciente (changelog visible)

### Shotlist Maestra
- Vista tabla con filtros por acto, escena, estado, locación, persona
- Vista tarjetas (preproducción visual, muestra reference images)
- Edición inline
- Chips de estado color-coded con paleta SMPTE

### Moodboard
- Vista freeform: pin-board con drag & drop
- Vista grid: auto-layout limpio
- Upload directo o embed de URL (Instagram, Pinterest, etc.)

### Día de Rodaje
- Timeline del día con soporte de bloques en paralelo (multi-columna)
- Call sheet lista para exportar
- Modo "on set": vista compacta para tablet/móvil

### Perfil de Persona / Tasks
- Vista kanban de tasks por estado
- Filtro por prioridad, fecha, entidad vinculada
- Indicador de carga por persona (cuántas tasks activas tiene)

### Generador de Claqueta
- Preview en tiempo real
- Toggle por campo
- Botón "Export PNG / PDF"

---

### 1.9 Stack Técnico

| Capa | Opción |
|------|--------|
| **Frontend** | Next.js (React) |
| **Rich Text Editor** | TipTap (extensible, soporta bloques custom para guión y tasks) |
| **Database** | PostgreSQL vía Supabase (auth + storage + realtime incluidos) |
| **ORM** | Prisma |
| **Asset Storage** | Supabase Storage / Cloudflare R2 |
| **PDF Export** | React-PDF (declarativo) + Puppeteer (para documentos complejos) |
| **Realtime** | Supabase Realtime (para changelog en vivo y presencia de usuarios) |
| **Deploy** | Vercel (frontend) + Supabase (backend/BD) |

> La colaboración en tiempo real no es MVP 1.0 pero la arquitectura (Supabase Realtime) la habilita sin refactors mayores cuando llegue el momento.

---

### 1.10 Roadmap de Funcionalidades

### MVP 1.0 — Core Production
- Proyecto + miembros + permisos básicos
- Shotlist maestra completa (con reference images, slate config)
- Personas (4 subclases) + Tasks
- Locaciones, Props, Stylings, Equipment
- Producción: days + schedule con paralelos
- Guión (editor básico)
- Moodboard (proyecto + escena)
- ChangeLog global con named versions
- Exportaciones: Call Sheet, Shot List, Production Schedule, Script
- UI: dark SMPTE-inspired, inglés

### MVP+ — Collaboration & Polish
- Comentarios y threads por entidad
- Notificaciones de cambios
- Exportaciones adicionales (Breakdown, Stripboard, Talent Schedule)
- Generador de claqueta completo (PDF + PNG)
- Internacionalización (EN + ES)

### v2.0 — Scale & Intelligence
- Colaboración en tiempo real (cursores, presencia)
- Vista de mapa para locaciones
- Integración de clima (locaciones exteriores)
- Budget tracker
- Templates de proyecto:
  - **Demo template**: una plantilla global precargada con datos realistas (comercial ficticio) que hace showcase completo de todas las features. Sirve de onboarding implícito — el usuario la explora y entiende la app sin leer documentación.
  - **Clonar proyecto propio**: duplica estructura y datos de un proyecto anterior del usuario.
- Tutorial interactivo (guided tour por módulos, tooltips contextuales) — evaluar si va en MVP 1.0 o MVP+
- Modo offline (PWA)
- AI: breakdown automático desde PDF de guión
- App móvil nativa

---

*Documento vivo — v0.2. Actualizado con feedback de sesión 2.*

---

## 2. Architecture Document

### 2.1 Principios Guía

- **Type safety end-to-end**: un error de tipo se atrapa en compilación, no en producción a las 2am
- **Separación real de responsabilidades**: frontend y API son servicios independientes, desplegables y escalables por separado
- **Monorepo con código compartido**: sin duplicar tipos ni validators entre capas
- **Arquitectura que soporta el roadmap**: el MVP no debe requerir refactors para habilitar realtime o colaboración en v2
- **Complejidad justa**: no sobrearquitecturar. Las abstracciones existen solo donde hay razón concreta

---

### 2.2 Vista General del Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                  │
│   Next.js App Router                                             │
│   ├── tRPC Client (type-safe calls → API)                        │
│   ├── TipTap (rich text editors)                                 │
│   ├── Supabase JS Client (auth tokens + realtime subscriptions)  │
│   └── React Query (cache + invalidation, viene con tRPC)         │
└──────────────┬───────────────────────────────┬───────────────────┘
               │ HTTPS + JSON (tRPC)            │ WebSocket (Supabase Realtime)
               ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────────┐
│      API SERVICE         │    │        SUPABASE PLATFORM         │
│   Node.js + Hono         │    │                                  │
│                          │    │  ┌─────────────────────────┐     │
│  ┌────────────────────┐  │    │  │  Auth (JWT + sessions)  │     │
│  │   tRPC Router      │  │    │  └─────────────────────────┘     │
│  │  ├── project       │  │    │                                  │
│  │  ├── shotlist      │  │    │  ┌─────────────────────────┐     │
│  │  ├── persons       │  │    │  │  PostgreSQL (primary DB) │     │
│  │  ├── schedule      │  │    │  └─────────────────────────┘     │
│  │  ├── exports       │  │    │                                  │
│  │  └── ...           │  │    │  ┌─────────────────────────┐     │
│  └────────────────────┘  │    │  │  Storage (assets/files) │     │
│                          │◄───┤  └─────────────────────────┘     │
│  ┌────────────────────┐  │    │                                  │
│  │   Middleware       │  │    │  ┌─────────────────────────┐     │
│  │  ├── auth verify   │  │    │  │  Realtime (changelog     │     │
│  │  ├── permissions   │  │    │  │  feed, presencia v2)    │     │
│  │  └── changelog     │  │    │  └─────────────────────────┘     │
│  └────────────────────┘  │    │                                  │
│                          │    └──────────────────────────────────┘
│  ┌────────────────────┐  │
│  │   Services         │  │
│  │  ├── pdfExport     │  │
│  │  ├── slateGen      │  │
│  │  └── assetManager  │  │
│  └────────────────────┘  │
│                          │
│   Prisma ORM ────────────┼──► PostgreSQL
└──────────────────────────┘
```

---

### 2.3 Estructura del Monorepo (Turborepo + pnpm)

```
frame/
├── apps/
│   ├── web/                        # Next.js 14 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, register
│   │   │   ├── (app)/              # Dashboard, proyectos
│   │   │   │   ├── projects/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── shotlist/
│   │   │   │   │   │   ├── script/
│   │   │   │   │   │   ├── schedule/
│   │   │   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── trpc.ts             # tRPC client setup
│   │   └── package.json
│   │
│   └── api/                        # Node.js + Hono + tRPC
│       ├── src/
│       │   ├── index.ts            # Entry point, Hono server
│       │   ├── routers/
│       │   │   ├── project.ts
│       │   │   ├── shotlist.ts
│       │   │   ├── persons.ts
│       │   │   ├── schedule.ts
│       │   │   ├── exports.ts
│       │   │   └── index.ts        # AppRouter (tipo exportado al web)
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── permissions.ts
│       │   │   └── changelog.ts
│       │   └── services/
│       │       ├── pdfExport.ts
│       │       ├── slateGenerator.ts
│       │       └── assetManager.ts
│       └── package.json
│
├── packages/
│   ├── db/                         # Prisma schema + cliente generado
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── index.ts                # export { prisma, Prisma }
│   │   └── package.json
│   │
│   ├── validators/                 # Zod schemas compartidos
│   │   ├── shot.ts
│   │   ├── person.ts
│   │   ├── project.ts
│   │   └── index.ts
│   │
│   └── tsconfig/                   # TS configs base
│       ├── base.json
│       ├── nextjs.json
│       └── node.json
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Por qué Turborepo
- Build caching: si `packages/db` no cambió, no se re-buildea
- Pipeline de tareas con dependencias declaradas: `web` depende del build de `api` (para los tipos), `api` depende de `db`
- Un solo `pnpm install` instala todo el monorepo

---

### 2.4 Type Safety End-to-End: Cómo Funciona

El punto central de la arquitectura. El `web` app **nunca importa código de `api`**, solo su tipo:

```typescript
// apps/web/lib/trpc.ts
import type { AppRouter } from '@frame/api'  // ← solo el TYPE, cero runtime
import { createTRPCReact } from '@trpc/react-query'

export const trpc = createTRPCReact<AppRouter>()
```

El flujo completo de tipos:

```
prisma/schema.prisma
        │
        ▼ prisma generate
@frame/db  →  tipos Prisma (Shot, Person, Project...)
        │
        ▼ importados en
@frame/api  →  tRPC procedures con input/output tipados via Zod
        │
        ▼ export type AppRouter
@frame/web  →  trpc.shotlist.getByScene.useQuery({ sceneId })
               ^── TypeScript sabe exactamente qué retorna esto
```

Si cambias el schema de `Shot` en Prisma y eso rompe un procedure en la API, TypeScript lo marca en el frontend **antes de que corras el código**.

---

### 2.5 tRPC: Estructura de Routers y Middleware

### Middleware stack (se aplica en orden)

```typescript
// 1. Verificación de auth (todas las rutas protegidas)
const authedProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    const user = await verifySupabaseToken(ctx.req.headers.authorization)
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return next({ ctx: { ...ctx, user } })
  })

// 2. Inyección de permisos (rutas que operan sobre un proyecto)
const projectProcedure = authedProcedure
  .input(z.object({ projectId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const permissions = await getProjectPermissions(ctx.user.id, input.projectId)
    if (!permissions) throw new TRPCError({ code: 'FORBIDDEN' })
    return next({ ctx: { ...ctx, permissions } })
  })

// 3. Guard de permiso específico (en cada procedure que lo necesita)
const canEditShotlist = projectProcedure
  .use(({ ctx, next }) => {
    if (!ctx.permissions.canEditShotlist)
      throw new TRPCError({ code: 'FORBIDDEN' })
    return next()
  })
```

### Estructura de un router típico

```typescript
// routers/shotlist.ts
export const shotlistRouter = router({
  getByScene: projectProcedure
    .input(z.object({ projectId: z.string(), sceneId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.shot.findMany({
        where: { sceneId: input.sceneId },
        include: { people: true, props: true, equipment: true }
      })
    }),

  update: canEditShotlist
    .input(ShotUpdateSchema)       // ← Zod schema de @frame/validators
    .mutation(async ({ ctx, input }) => {
      const shot = await prisma.shot.update({ ... })
      // el changelog se genera automáticamente via Prisma middleware
      return shot
    }),
})
```

---

### 2.6 Base de Datos: Decisiones de Diseño

### 6.1 Polimorfismo de `Person`: Joined Table Inheritance

Se elige sobre Single Table Inheritance porque las subclases tienen campos muy distintos y una tabla ancha con 30 columnas nullable es difícil de mantener.

```prisma
// packages/db/prisma/schema.prisma

model Person {
  id         String     @id @default(cuid())
  name       String
  email      String?
  phone      String?
  department Department
  role       String
  type       PersonType // enum: TALENT | CREW | POST_CREW | CLIENT
  callTime   String?
  notes      Json?      // RichText como JSON (TipTap format)

  talent   Talent?
  crew     Crew?
  postCrew PostCrew?
  client   Client?

  tasks      Task[]
  shotPeople ShotPerson[]
  changelog  ChangeEntry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Talent {
  personId      String  @id
  person        Person  @relation(fields: [personId], references: [id], onDelete: Cascade)
  characterName String?
  agencyName    String?
  agencyContact String?
  measurements  Json?
  portfolio     String[]
}

model Crew {
  personId  String    @id
  person    Person    @relation(fields: [personId], references: [id], onDelete: Cascade)
  crewType  CrewType
  vehicle   String?
}

// etc.
```

En Prisma, queries polimórficas son limpias:
```typescript
// Traer todas las personas de un proyecto con sus datos específicos
prisma.person.findMany({
  where: { projectMembers: { some: { projectId } } },
  include: { talent: true, crew: true, postCrew: true, client: true }
})
```

### 6.2 RichText: almacenado como JSON (JSONB)

TipTap genera documentos JSON internamente. Se almacenan directamente en columnas `Json` de Prisma (mapeadas a `jsonb` en PostgreSQL). Ventajas: queries parciales posibles con operadores JSONB, no se pierde formato.

### 6.3 Assets: metadata en BD, archivo en Storage

```prisma
model Asset {
  id           String   @id @default(cuid())
  filename     String
  mimeType     String
  size         Int
  storagePath  String   // path en Supabase Storage
  publicUrl    String   // URL firmada o pública según el bucket
  uploadedBy   String   // userId
  createdAt    DateTime @default(now())
}
```

Los buckets en Supabase Storage se organizan así:
```
frame-assets/
├── projects/{projectId}/moodboard/
├── projects/{projectId}/scenes/{sceneId}/moodboard/
├── projects/{projectId}/shots/{shotId}/references/
├── projects/{projectId}/persons/{personId}/
├── projects/{projectId}/props/{propId}/
├── projects/{projectId}/stylings/{stylingId}/
└── exports/                          # PDFs generados (TTL corto)
```

---

### 2.7 ChangeLog: Prisma Middleware (Application-Level)

No se usan triggers de PostgreSQL. En cambio, un Prisma `$extends` intercepta todas las mutaciones y genera `ChangeEntry` de forma automática y no-bloqueante.

```typescript
// packages/db/index.ts
export const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Solo operaciones de escritura
        if (!['create', 'update', 'delete', 'upsert'].includes(operation)) {
          return query(args)
        }

        // Snapshot antes (para el diff)
        let before = null
        if (operation !== 'create' && args.where) {
          before = await (prisma as any)[model].findFirst({ where: args.where })
        }

        const result = await query(args)

        // Log asíncrono — no bloquea la respuesta
        setImmediate(async () => {
          await prisma.changeEntry.create({
            data: {
              entityType: model,
              entityId: result?.id ?? args.where?.id,
              action: operation === 'create' ? 'created'
                    : operation === 'delete' ? 'deleted' : 'updated',
              diff: computeDiff(before, result),  // JSONPatch
              userId: getCurrentUserId(),          // viene del contexto de request
              projectId: extractProjectId(model, result),
            }
          })
        })

        return result
      }
    }
  }
})
```

El `userId` del contexto de request se inyecta vía AsyncLocalStorage — así el middleware de Prisma sabe quién hizo el cambio sin pasarlo manualmente en cada query.

---

### 2.8 Auth: Supabase Auth + Verificación en API

El flujo:

```
1. Usuario hace login en web (Supabase Auth)
   → Supabase emite un JWT (access token)

2. web guarda el token en cookie httpOnly (Next.js middleware)

3. En cada request al API:
   → web incluye el token en Authorization: Bearer <token>

4. API verifica el token con Supabase Admin SDK:
   const { data: { user } } = await supabase.auth.getUser(token)

5. user.id queda en el contexto de tRPC para todos los procedures
```

Supabase Auth maneja: registro, login, magic links, OAuth (Google, etc.), refresh tokens. Cero código de auth que mantener.

---

### 2.9 Pipeline de Exportación PDF / PNG

Dos herramientas con roles distintos:

### React-PDF (`@react-pdf/renderer`) — documentos estructurados
Para: Call Sheet, Shot List, Production Schedule, Script, Breakdown, Props List, Equipment List.

Se renderiza **server-side en la API**:
```typescript
// services/pdfExport.ts
import { renderToStream } from '@react-pdf/renderer'
import { CallSheetDocument } from './templates/CallSheet'

export async function generateCallSheet(productionDayId: string): Promise<Buffer> {
  const data = await prisma.productionDay.findUnique({
    where: { id: productionDayId },
    include: { /* relaciones necesarias */ }
  })

  const stream = await renderToStream(<CallSheetDocument data={data} />)
  return streamToBuffer(stream)
}
```

El tRPC procedure de exportación retorna una URL firmada de Supabase Storage donde el PDF fue subido temporalmente (TTL: 1 hora). El cliente descarga desde esa URL directamente.

### Puppeteer — Slate PNG / overlay
Para: render pixel-perfect del componente de claqueta como PNG usable en postproducción.

```typescript
// services/slateGenerator.ts
export async function generateSlatePNG(shotId: string): Promise<Buffer> {
  const shot = await prisma.shot.findUnique({ where: { id: shotId }, include: { ... } })
  const html = renderSlateToHTML(shot)  // template HTML estático

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })
  await page.setContent(html)
  const screenshot = await page.screenshot({ type: 'png' })
  await browser.close()

  return screenshot
}
```

> Puppeteer se instancia bajo demanda, no hay un browser persistente. Para volumen alto (futuro) se puede mover a un worker dedicado o usar una solución como Browserless.

---

### 2.10 Realtime: Supabase Realtime Channels

Para MVP 1.0 se abre **un canal por proyecto** que emite eventos de changelog. Liviano y suficiente para mostrar el feed de actividad en tiempo real en el dashboard.

```typescript
// apps/web — suscripción al canal del proyecto
const channel = supabase
  .channel(`project:${projectId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'change_entries',
    filter: `project_id=eq.${projectId}`
  }, (payload) => {
    // Invalida el query de changelog en React Query
    trpc.changelog.getByProject.invalidate({ projectId })
  })
  .subscribe()
```

**Para v2 (colaboración real):**
La estrategia cambia a Yjs (CRDT) para los editores colaborativos (shotlist, guión), con Supabase como persistence layer del documento Yjs. TipTap tiene soporte nativo de Yjs. Esto no requiere cambios en la arquitectura base — se agrega como una capa encima.

---

### 2.11 Environments y Deploy

```
frame/
├── Production
│   ├── web      → Vercel (auto-deploy desde main)
│   └── api      → Railway o Fly.io (Dockerfile, auto-deploy desde main)
│
├── Staging
│   ├── web      → Vercel Preview (por PR)
│   └── api      → Railway staging environment
│
└── Local
    ├── web      → localhost:3000
    ├── api      → localhost:3001
    └── db       → Supabase local (supabase start) o instancia de desarrollo
```

### Variables de entorno

```bash
# apps/api/.env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # solo en API, nunca en browser
STORAGE_BUCKET=frame-assets

# apps/web/.env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # pública, solo para auth y realtime
NEXT_PUBLIC_API_URL=https://api.frame.app
```

La `SERVICE_ROLE_KEY` de Supabase (que bypasea RLS) **solo vive en la API**, nunca en el cliente. El cliente solo tiene la `ANON_KEY`.

---

### 2.12 Decisiones Cerradas

| Decisión | Elección | Razón |
|----------|----------|-------|
| Monorepo | Turborepo + pnpm | Tipos compartidos sin duplicación |
| Frontend | Next.js 14 App Router | SSR, routing, ecosystem |
| API layer | Node.js + Hono + tRPC | Lightweight, type-safe, performant |
| Type safety | tRPC + Zod + Prisma | End-to-end, sin codegen manual |
| ORM | Prisma | Schema-first, migraciones, tipos auto-generados |
| DB | PostgreSQL vía Supabase | Relacional + BaaS (auth, storage, realtime) |
| Person polymorphism | Joined Table Inheritance | Subclases con campos distintos, mantenible |
| ChangeLog | Prisma `$extends` middleware | Automático pero en capa de aplicación, controlable |
| Rich Text | TipTap (JSON storage) | Extensible, soporte Yjs para v2, JSON nativo |
| PDF (documentos) | React-PDF server-side | Declarativo, fácil de mantener templates |
| PDF (slate) | Puppeteer | Pixel-perfect, soporte PNG overlay |
| Auth | Supabase Auth | Cero código de auth, integrado con DB y Storage |
| Realtime | Supabase Realtime | Ya incluido, suficiente para MVP y v2 |
| Deploy API | Railway / Fly.io | Containers, simples, costo controlado |
| Deploy Web | Vercel | Native Next.js, preview por PR |

---

### 2.13 Freemium Enforcement

### Principio
**La API es el único gate real.** El frontend puede deshabilitar botones y mostrar paywalls para buena UX, pero nunca se confía en él como control de acceso. Si alguien llama la API directamente, el límite se sostiene igual.

### Configuración centralizada de planes

Un solo objeto de verdad en la API. Cuando cambian los planes, se edita un archivo:

```typescript
// apps/api/src/config/plans.ts
export const PLAN_LIMITS = {
  free: {
    maxActiveProjects: 1,         // proyectos activos (archivados no cuentan)
    maxCollaborators: 3,          // director + 2 más (suficiente para producción pequeña)
    storageMB: 500,
    changelogRetentionDays: 30,
    exports: ['call_sheet', 'shot_list', 'script'] as const,
    exportsPerDay: 10,
    slateGenerator: false,
    advancedExports: false,       // breakdown, stripboard, production schedule
    granularPermissions: false,
  },
  pro: {
    maxActiveProjects: Infinity,
    maxCollaborators: 15,
    storageMB: 10_000,
    changelogRetentionDays: Infinity,
    exports: 'all' as const,
    exportsPerDay: 100,
    slateGenerator: true,
    advancedExports: true,
    granularPermissions: false,
  },
  team: {
    maxActiveProjects: Infinity,
    maxCollaborators: Infinity,
    storageMB: 50_000,
    changelogRetentionDays: Infinity,
    exports: 'all' as const,
    exportsPerDay: Infinity,
    slateGenerator: true,
    advancedExports: true,
    granularPermissions: true,    // el único tier con permisos por módulo
  },
} satisfies Record<string, PlanConfig>
```

### Por qué estos límites (razonamiento de negocio)

| Límite | Razonamiento |
|--------|-------------|
| **1 proyecto activo en Free** | Un freelancer o estudiante puede hacer una producción completa. El techo se alcanza naturalmente cuando escala a más clientes simultáneos. |
| **3 colaboradores en Free** | Suficiente para director + DP + coordinador. No se corta el valor en equipo mínimo, pero sí se bloquea el uso profesional real. |
| **Exports avanzados en Pro** | El production schedule, breakdown y slate son docs de producción profesional. Son el momento exacto en que un usuario pequeño se convierte en cliente. |
| **Permisos granulares solo en Team** | No es una feature que un productor individual necesite. Es una feature de coordinación entre departamentos — aplica cuando hay un equipo real. |
| **Storage 500MB Free** | Un proyecto pequeño con fotos de referencia y un moodboard entra cómodo. Un proyecto profesional con scouting, looks y referencias no. |

### Middleware en la API

```typescript
// middleware/plan.ts
export const planMiddleware = t.middleware(async ({ ctx, next, meta }) => {
  const subscription = await getUserSubscription(ctx.user.id)
  const limits = PLAN_LIMITS[subscription.plan]

  // El contexto ahora incluye los límites — cada procedure los usa
  return next({ ctx: { ...ctx, plan: subscription.plan, limits } })
})

// Uso en un procedure con gate de plan
const createProject = planMiddleware
  .mutation(async ({ ctx, input }) => {
    if (ctx.plan === 'free') {
      const activeCount = await prisma.project.count({
        where: { ownerId: ctx.user.id, status: { not: 'archived' } }
      })
      if (activeCount >= ctx.limits.maxActiveProjects) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'PLAN_LIMIT_EXCEEDED:active_projects'
        })
      }
    }
    // ... crear proyecto
  })
```

El frontend interpreta el mensaje `PLAN_LIMIT_EXCEEDED:active_projects` y muestra el modal de upgrade correcto.

---

### 2.14 Rate Limiting y Export Queue

### Problema
PDF y PNG son operaciones pesadas (2–10s, uso de memoria significativo). No pueden bloquearse en un request HTTP normal sin degradar la API completa.

### Solución: BullMQ + Redis — export como job asíncrono

```
Cliente                API                  Worker              Storage
   │                    │                      │                    │
   ├─ export.request ──►│                      │                    │
   │                    ├─ createJob ──────────►│                    │
   │◄── { jobId } ──────┤                      │                    │
   │                    │                      │                    │
   │  (polling o RT)    │         render PDF   │                    │
   │                    │                      ├─ upload ──────────►│
   │                    │                      │◄── url ────────────┤
   │                    │◄─ job:complete ───────┤                    │
   │◄── { url } ────────┤                      │                    │
```

```typescript
// El procedure de exportación retorna un jobId inmediatamente
export const requestExport = authedProcedure
  .input(ExportRequestSchema)
  .mutation(async ({ ctx, input }) => {
    // Rate limit check
    const today = await getExportCount(ctx.user.id, 'today')
    const limit = PLAN_LIMITS[ctx.plan].exportsPerDay
    if (today >= limit) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' })

    const job = await exportQueue.add('generate', {
      type: input.type,         // 'call_sheet' | 'slate_png' | etc.
      entityId: input.entityId,
      userId: ctx.user.id,
      projectId: input.projectId,
    })

    return { jobId: job.id }
  })

// El cliente observa el estado via Supabase Realtime
// (el worker actualiza una tabla export_jobs cuando termina)
```

**Límites de exports por día:**

| Plan | Exports/día |
|------|-------------|
| Free | 10 |
| Pro | 100 |
| Team | Ilimitado |

**Rate limiting general de API** (requests por minuto) se maneja con `@hono/rate-limiter` usando Redis como store. Límite sugerido: 300 req/min por usuario autenticado.

---

### 2.15 Supabase RLS — Segunda Capa de Defensa

### Filosofía
RLS **no reemplaza** los checks de permisos en la API. Es una red de seguridad para el caso donde alguien accede a Supabase directamente con la `ANON_KEY` (imposible desde la app, pero posible si hay un bug o una filtración). La API usa `SERVICE_ROLE_KEY` que bypasea RLS — así que RLS nunca frena requests legítimos.

### Política única y mantenible

Una sola política por tabla, basada en membresía al proyecto:

```sql
-- Aplicada a: shots, scenes, acts, persons, locations,
--             props, stylings, equipment, production_days, tasks
CREATE POLICY "project_members_only" ON shots
  FOR ALL                          -- SELECT, INSERT, UPDATE, DELETE
  USING (
    project_id IN (
      SELECT project_id
      FROM project_members
      WHERE user_id = auth.uid()
    )
  );
```

Esto se genera automáticamente para todas las tablas project-scoped con una función de migración. No se escribe a mano 20 veces.

**Lo que RLS no hace:** verificar permisos granulares (canEditShotlist, etc.). Eso es responsabilidad exclusiva del middleware de la API, que tiene contexto completo del usuario y el proyecto.

---

### 2.16 Testing Strategy

### Pirámide

```
        ┌─────────────────┐
        │   E2E (pocos)   │  Playwright — flujos críticos únicamente
        ├─────────────────┤
        │  Integration    │  tRPC test client + DB de test
        │  (moderados)    │  Cada router: happy path + error de permisos
        ├─────────────────┤
        │  Unit (muchos)  │  Vitest — services, validators, utils puros
        └─────────────────┘
```

### Unit tests (Vitest)
- **Zod validators** de `@frame/validators`: inputs válidos, inválidos, edge cases
- **Services puros**: `computeDiff()`, `resolveSlateFields()`, `applyPlanLimits()`
- **Plan config**: que los límites del Free tier sean más restrictivos que Pro, etc.

### Integration tests (Vitest + tRPC caller)
```typescript
// Cada router tiene un archivo *.test.ts
it('should return FORBIDDEN if user lacks canEditShotlist', async () => {
  const caller = createCaller({ user: mockUser, permissions: { canEditShotlist: false } })
  await expect(caller.shotlist.update({ shotId: '...', data: {} }))
    .rejects.toThrow('FORBIDDEN')
})
```
Se usa una base de datos de test real (PostgreSQL en Docker) reseteada por test suite con `prisma db push --force-reset`.

### E2E (Playwright) — solo flujos que serían catastróficos si rompen
1. Crear proyecto → agregar escena → agregar shot → exportar call sheet → descargar PDF
2. Invitar colaborador → verificar que puede ver el proyecto
3. Usuario Free intenta crear segundo proyecto → ver modal de upgrade

### Sin coverage targets
Los targets de cobertura incentivan tests inútiles. En cambio: cada función exportada de `services/` tiene tests; cada router tiene tests de permisos.

---

### 2.17 Error Handling

### En la API: `TRPCError` con códigos semánticos

```typescript
// Errores de dominio con mensajes estructurados
throw new TRPCError({
  code: 'FORBIDDEN',
  message: 'PLAN_LIMIT_EXCEEDED:active_projects'  // parseado en el cliente
})

throw new TRPCError({
  code: 'CONFLICT',
  message: 'SHOT_ALREADY_FILMED'
})

throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'ENTITY_NOT_FOUND:shot'
})
```

### Formatter global en el servidor

```typescript
// apps/api/src/trpc.ts
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    // En desarrollo: stack trace completo
    // En producción: solo el mensaje, el resto va a Sentry
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error)
    }
    return {
      ...shape,
      data: {
        ...shape.data,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }
    }
  }
})
```

### En el cliente

```typescript
// apps/web/lib/errorHandler.ts
export function parseApiError(error: TRPCClientError<AppRouter>) {
  const [type, detail] = error.message.split(':')

  const UI_MESSAGES: Record<string, string> = {
    'PLAN_LIMIT_EXCEEDED:active_projects': 'Alcanzaste el límite de proyectos activos.',
    'PLAN_LIMIT_EXCEEDED:collaborators': 'Alcanzaste el límite de colaboradores.',
    'SHOT_ALREADY_FILMED': 'Este shot ya fue marcado como filmado.',
    'ENTITY_NOT_FOUND:shot': 'El shot no existe o fue eliminado.',
  }

  return UI_MESSAGES[error.message] ?? 'Algo salió mal. Intenta de nuevo.'
}
```

Un `<GlobalErrorBoundary>` en el layout captura errores no manejados y muestra un estado de error limpio. Los errores `UNAUTHORIZED` redirigen a login automáticamente.

---

### 2.18 Decisiones Cerradas — Tabla Completa

| Decisión | Elección |
|----------|----------|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 14 App Router |
| API layer | Node.js + Hono + tRPC |
| Type safety | tRPC + Zod + Prisma end-to-end |
| ORM | Prisma con `$extends` para changelog |
| DB | PostgreSQL vía Supabase |
| Person polymorphism | Joined Table Inheritance |
| Rich Text | TipTap (JSON/JSONB storage) |
| Auth | Supabase Auth (JWT → API) |
| Storage | Supabase Storage (organizado por proyecto) |
| Realtime | Supabase Realtime (changelog feed MVP, Yjs en v2) |
| PDF documentos | React-PDF server-side en la API |
| PNG slate | Puppeteer on-demand |
| Export pipeline | BullMQ + Redis (jobs asíncronos) |
| Rate limiting | @hono/rate-limiter + Redis |
| Freemium gate | API middleware (única fuente de verdad) |
| Permisos granulares | tRPC middleware por procedure |
| RLS | Supabase RLS como segunda capa (política única por tabla) |
| Testing | Vitest (unit + integration) + Playwright (E2E crítico) |
| Error handling | TRPCError con códigos semánticos + Sentry en prod |
| Deploy API | Railway / Fly.io (container) |
| Deploy Web | Vercel |

---

*Documento vivo — v0.2*

---

## 3. Database Schema (Prisma)

> **Nota v0.3:** este borrador se conserva como referencia. El schema fuente de verdad es
> [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma), que incorpora las
> resoluciones #4, #7, #8, #9 y #11 de §0.

```prisma
// ╔══════════════════════════════════════════════════════════════╗
// ║  FRAME — Production Management App                          ║
// ║  Prisma Schema v0.1                                         ║
// ║  DB: PostgreSQL (Supabase)                                  ║
// ╚══════════════════════════════════════════════════════════════╝

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Supabase requires this for migrations
}

// ──────────────────────────────────────────────────────────────
// ENUMS
// ──────────────────────────────────────────────────────────────

enum PlanTier {
  FREE
  PRO
  TEAM
}

enum ProjectType {
  COMMERCIAL
  MUSIC_VIDEO
  SHORT_FILM
  FEATURE_FILM
  DOCUMENTARY
  CONTENT
  OTHER
}

enum ProjectStatus {
  DEVELOPMENT
  PRE_PRODUCTION
  PRODUCTION
  POST_PRODUCTION
  DELIVERED
  ARCHIVED
}

enum Department {
  DIRECTION
  PRODUCTION
  PHOTOGRAPHY
  ART
  MAKEUP_HAIR
  WARDROBE
  SOUND
  POST
  TALENT
  CLIENT
  OTHER
}

enum PersonType {
  TALENT
  CREW
  POST_CREW
  CLIENT
}

enum CrewType {
  HEAD_OF_DEPARTMENT
  OPERATOR
  ASSISTANT
}

enum DaylightType {
  DAWN
  MORNING
  MIDDAY
  AFTERNOON
  SUNSET
  NIGHT
  DEEP_NIGHT
  STUDIO
}

enum FrameSize {
  ECU
  CU
  MCU
  MS
  MLS
  LS
  ELS
  AERIAL
  POV
  OTS
  TWO_SHOT
  INSERT
  OTHER
}

enum CameraMovement {
  STATIC
  PAN
  TILT
  DOLLY
  STEADICAM
  HANDHELD
  DRONE
  CRANE
  ZOOM
  PUSH_IN
  PULL_OUT
  ARC
  OTHER
}

enum CameraAngle {
  EYE_LEVEL
  HIGH_ANGLE
  LOW_ANGLE
  DUTCH
  BIRDS_EYE
  WORMS_EYE
}

enum ShotStatus {
  NOT_FILMED
  IN_PROGRESS
  FILMED
  APPROVED
  DISCARDED
}

enum LocationType {
  INTERIOR
  EXTERIOR
  STUDIO
  NATURAL
  URBAN
  RURAL
  WATER
  OTHER
}

enum PermitStatus {
  NOT_REQUIRED
  PENDING
  IN_PROCESS
  OBTAINED
}

enum PropCategory {
  PROP
  SET_DRESSING
  VEHICLE
  FOOD
  WEAPON
  DOCUMENT
  TECH
  OTHER
}

enum PropStatus {
  SEARCHING
  IN_FABRICATION
  CONFIRMED
  IN_STORAGE
  ON_SET
  RETURNED
}

enum PropSource {
  OWN
  RENTED
  PURCHASED
  BORROWED
}

enum StylingItemStatus {
  SEARCHING
  CONFIRMED
  ON_LOAN
  PURCHASED
}

enum EquipmentType {
  CAMERA
  LENS
  STEADICAM
  SLIDER
  DRONE
  LIGHTING
  SOUND
  GRIP
  OTHER
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  DONE
  BLOCKED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum ChangeAction {
  CREATED
  UPDATED
  DELETED
  RESTORED
}

enum ScheduleBlockType {
  SETUP
  SHOOTING
  CATERING
  BREAK
  WARDROBE_CHANGE
  TRAVEL
  PICKUP
  WRAP
  OTHER
}

enum MoodboardItemType {
  IMAGE
  VIDEO_REF
  COLOR_SWATCH
  TEXT_NOTE
  URL_EMBED
}

enum ExportType {
  CALL_SHEET
  SHOT_LIST
  PRODUCTION_SCHEDULE
  SCENE_BREAKDOWN
  SCRIPT
  STRIPBOARD
  TALENT_SCHEDULE
  PROPS_LIST
  EQUIPMENT_LIST
  SLATE_PDF
  SLATE_PNG
}

enum ExportJobStatus {
  QUEUED
  PROCESSING
  DONE
  FAILED
}

// ──────────────────────────────────────────────────────────────
// USER
// Auth handled by Supabase. User.id = Supabase auth.uid() (UUID).
// ──────────────────────────────────────────────────────────────

model User {
  id        String   @id // UUID from Supabase Auth — no @default
  email     String   @unique
  name      String
  avatarUrl String?
  plan      PlanTier @default(FREE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ownedProjects  Project[]       @relation("ProjectOwner")
  projectMembers ProjectMember[]
  persons        Person[]
  tasksCreated   Task[]          @relation("TaskCreatedBy")
  tasksAssigned  Task[]          @relation("TaskAssignedTo")
  changeEntries  ChangeEntry[]
  exportJobs     ExportJob[]
}

// ──────────────────────────────────────────────────────────────
// PROJECT
// ──────────────────────────────────────────────────────────────

model Project {
  id             String        @id @default(cuid())
  title          String
  type           ProjectType
  client         String?
  brand          String?
  description    Json?         // RichText (TipTap JSON)
  status         ProjectStatus @default(DEVELOPMENT)
  shootDates     Json?         // { start: Date, end: Date }[]
  creationSource String        @default("blank") // "blank" | "demo_template" | "cloned_project"
  clonedFromId   String?       // string ref — intentionally not a Prisma relation

  ownerId String
  owner   User   @relation("ProjectOwner", fields: [ownerId], references: [id])

  members        ProjectMember[]
  acts           Act[]
  script         Script?
  persons        Person[]
  locations      Location[]
  props          Prop[]
  equipment      Equipment[]
  productionDays ProductionDay[]
  assets         Asset[]
  moodboard      MoodboardBoard? @relation("ProjectMoodboard")
  changeEntries  ChangeEntry[]
  exportJobs     ExportJob[]
  tasks          Task[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([status])
}

// permissions JSON shape (PermissionSet):
// { canEditScript, canEditShotlist, canEditCameraData, canEditSchedule,
//   canEditPeople, canEditLocations, canEditStyling, canEditProps,
//   canExport, canManageMembers, isAdmin }
model ProjectMember {
  id          String  @id @default(cuid())
  projectId   String
  userId      String
  projectRole String
  permissions Json
  isAdmin     Boolean @default(false)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

// ──────────────────────────────────────────────────────────────
// SCRIPT
// ──────────────────────────────────────────────────────────────

model Script {
  id        String @id @default(cuid())
  projectId String @unique
  content   Json   // TipTap JSON — blocks: SceneHeading, Action, Character, Dialogue, Parenthetical, Transition

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scenes  Scene[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ──────────────────────────────────────────────────────────────
// STRUCTURE: PROJECT → ACT → SCENE → SHOT
// ──────────────────────────────────────────────────────────────

model Act {
  id          String  @id @default(cuid())
  projectId   String
  number      Int
  title       String?
  description Json?
  order       Int     @default(0)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scenes  Scene[]

  @@unique([projectId, number])
  @@index([projectId])
}

model Scene {
  id                String       @id @default(cuid())
  actId             String
  projectId         String       // denormalized
  number            String       // "1A", "2B"
  title             String
  synopsis          Json?        // RichText
  scriptRef         Json?        // { scriptId: string, blockId: string } | null
  scriptId          String?      // FK to Script for Prisma relation
  locationId        String?
  daylight          DaylightType @default(MORNING)
  estimatedDuration Int?         // minutes
  status            ShotStatus   @default(NOT_FILMED)
  notes             Json?        // RichText
  order             Int          @default(0)

  act      Act       @relation(fields: [actId], references: [id], onDelete: Cascade)
  script   Script?   @relation(fields: [scriptId], references: [id])
  location Location? @relation(fields: [locationId], references: [id])

  shots      Shot[]
  stylings   Styling[]      // implicit m2m
  sceneProps SceneProp[]
  moodboard  MoodboardBoard? @relation("SceneMoodboard")

  @@unique([actId, number])
  @@index([actId])
  @@index([projectId])
  @@index([locationId])
}

model Shot {
  id          String  @id @default(cuid())
  sceneId     String
  projectId   String  // denormalized
  shotNumber  String  // "1A-03"
  shotName    String
  description Json?   // RichText
  order       Int     @default(0)

  // Camera
  frameSize       FrameSize?
  lensSize        String?
  cameraMovements CameraMovement[]
  cameraAngle     CameraAngle?

  // Audio / Post
  voiceover    Json?
  soundEffects String[]
  musicRef     String?

  // Production
  estimatedDuration Int?
  filmed            Boolean    @default(false)
  takes             Int?
  selectedTake      Int?
  postNotes         Json?
  notes             Json?
  status            ShotStatus @default(NOT_FILMED)

  // Slate config — shape:
  // { enabled: boolean, layout: "standard"|"minimal"|"custom",
  //   fields: [{ fieldKey, label, valueSource, autoRef?, manualValue? }] }
  slateConfig Json?

  scene Scene @relation(fields: [sceneId], references: [id], onDelete: Cascade)

  people             ShotPerson[]
  stylings           ShotStyling[]
  props              ShotProp[]
  equipment          ShotEquipment[]
  assets             Asset[]
  scheduleBlockShots ScheduleBlockShot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([sceneId, shotNumber])
  @@index([sceneId])
  @@index([projectId])
  @@index([filmed])
  @@index([status])
}

// ──────────────────────────────────────────────────────────────
// PERSON — Joined Table Inheritance
// ──────────────────────────────────────────────────────────────

model Person {
  id         String     @id @default(cuid())
  projectId  String
  userId     String?    // optional — person has a login
  name       String
  email      String?
  phone      String?
  department Department
  role       String
  type       PersonType
  callTime   String?    // "HH:MM" general call
  notes      Json?      // RichText

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id])

  talent   Talent?
  crew     Crew?
  postCrew PostCrew?
  client   ClientPerson?

  shotPeople  ShotPerson[]
  stylings    Styling[]
  tasks       Task[]
  crewCalls   CrewCall[]
  talentCalls TalentCall[]
  assets      Asset[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
  @@index([type])
  @@index([department])
  @@index([userId])
}

model Talent {
  personId      String   @id
  characterName String?
  agencyName    String?
  agencyContact String?
  measurements  Json?    // { height, weight, sizes: Record<string, string> }
  portfolio     String[]
  availability  Json?    // { date: Date, available: boolean }[]

  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
}

model Crew {
  personId String   @id
  crewType CrewType
  vehicle  String?

  person    Person            @relation(fields: [personId], references: [id], onDelete: Cascade)
  equipment PersonEquipment[]
}

model PostCrew {
  personId     String   @id
  deliverables String[]
  software     String[]
  availability Json?    // { start: Date, end: Date }[]

  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
}

model ClientPerson {
  personId         String  @id
  companyName      String
  position         String?
  approvalRequired Boolean @default(false)

  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
}

// ──────────────────────────────────────────────────────────────
// SHOT ↔ PERSON  (explicit junction — carries role/action/emotion)
// ──────────────────────────────────────────────────────────────

model ShotPerson {
  id       String  @id @default(cuid())
  shotId   String
  personId String
  role     String? // role in THIS shot (may differ from Person.role)
  action   String?
  emotion  String?

  shot   Shot   @relation(fields: [shotId], references: [id], onDelete: Cascade)
  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@unique([shotId, personId])
  @@index([shotId])
  @@index([personId])
}

// ──────────────────────────────────────────────────────────────
// LOCATION
// ──────────────────────────────────────────────────────────────

model Location {
  id             String       @id @default(cuid())
  projectId      String
  name           String
  type           LocationType
  address        String?
  coordinates    Json?        // { lat: number, lng: number }
  contactName    String?
  contactPhone   String?
  permitRequired Boolean      @default(false)
  permitStatus   PermitStatus @default(NOT_REQUIRED)
  scoutingNotes  Json?        // RichText
  accessNotes    Json?        // RichText
  powerAvailable Boolean      @default(false)
  amenities      String[]
  availableDates Json?        // { start: Date, end: Date }[]

  project                Project                 @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scenes                 Scene[]
  assets                 Asset[]
  productionDayLocations ProductionDayLocation[]
  tasks                  Task[]

  @@index([projectId])
}

// ──────────────────────────────────────────────────────────────
// STYLING
// ──────────────────────────────────────────────────────────────

model Styling {
  id          String  @id @default(cuid())
  projectId   String
  characterId String  // Person.id — must be PersonType.TALENT
  lookName    String
  description Json?   // RichText
  hairRef     Json?   // { description: Json, assetIds: string[] }
  makeupRef   Json?   // { description: Json, assetIds: string[] }
  notes       Json?   // RichText

  character Person  @relation(fields: [characterId], references: [id])
  scenes    Scene[] // implicit m2m — Prisma generates _SceneToStyling

  garments    Garment[]
  accessories Accessory[]
  assets      Asset[]
  shots       ShotStyling[]

  @@index([projectId])
  @@index([characterId])
}

model Garment {
  id        String            @id @default(cuid())
  stylingId String
  item      String
  brand     String?
  color     String
  size      String?
  status    StylingItemStatus @default(SEARCHING)
  photoId   String?           // Asset.id — string ref, not Prisma FK (avoids circular)

  styling Styling @relation(fields: [stylingId], references: [id], onDelete: Cascade)

  @@index([stylingId])
}

model Accessory {
  id        String            @id @default(cuid())
  stylingId String
  item      String
  brand     String?
  color     String
  size      String?
  status    StylingItemStatus @default(SEARCHING)
  photoId   String?           // Asset.id — string ref

  styling Styling @relation(fields: [stylingId], references: [id], onDelete: Cascade)

  @@index([stylingId])
}

model ShotStyling {
  shotId    String
  stylingId String

  shot    Shot    @relation(fields: [shotId], references: [id], onDelete: Cascade)
  styling Styling @relation(fields: [stylingId], references: [id], onDelete: Cascade)

  @@id([shotId, stylingId])
}

// ──────────────────────────────────────────────────────────────
// PROP
// ──────────────────────────────────────────────────────────────

model Prop {
  id          String       @id @default(cuid())
  projectId   String
  name        String
  description Json?        // RichText
  category    PropCategory
  quantity    Int          @default(1)
  status      PropStatus   @default(SEARCHING)
  source      PropSource?
  sourceName  String?
  cost        Float?
  notes       Json?        // RichText

  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assets     Asset[]
  sceneProps SceneProp[]
  shotProps  ShotProp[]
  tasks      Task[]

  @@index([projectId])
  @@index([status])
}

model SceneProp {
  sceneId String
  propId  String

  scene Scene @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  prop  Prop  @relation(fields: [propId], references: [id], onDelete: Cascade)

  @@id([sceneId, propId])
}

model ShotProp {
  shotId String
  propId String

  shot Shot @relation(fields: [shotId], references: [id], onDelete: Cascade)
  prop Prop @relation(fields: [propId], references: [id], onDelete: Cascade)

  @@id([shotId, propId])
}

// ──────────────────────────────────────────────────────────────
// EQUIPMENT
// ──────────────────────────────────────────────────────────────

model Equipment {
  id             String        @id @default(cuid())
  projectId      String
  name           String
  type           EquipmentType
  brand          String?
  model          String?
  serialNumber   String?
  rentalSource   String?
  availableDates Json?         // { start: Date, end: Date }[]
  notes          String?

  project       Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignedTo    PersonEquipment[]
  shotEquipment ShotEquipment[]

  @@index([projectId])
  @@index([type])
}

model PersonEquipment {
  crewId      String
  equipmentId String

  crew      Crew      @relation(fields: [crewId], references: [personId], onDelete: Cascade)
  equipment Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)

  @@id([crewId, equipmentId])
}

model ShotEquipment {
  shotId      String
  equipmentId String

  shot      Shot      @relation(fields: [shotId], references: [id], onDelete: Cascade)
  equipment Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)

  @@id([shotId, equipmentId])
}

// ──────────────────────────────────────────────────────────────
// PRODUCTION DAY
// ──────────────────────────────────────────────────────────────

model ProductionDay {
  id              String   @id @default(cuid())
  projectId       String
  date            DateTime @db.Date
  generalCallTime String   // "HH:MM"
  generalNotes    Json?    // RichText
  status          String   @default("planned") // planned | in_progress | completed | postponed

  project        Project                 @relation(fields: [projectId], references: [id], onDelete: Cascade)
  locations      ProductionDayLocation[]
  scheduleBlocks ScheduleBlock[]
  crewCalls      CrewCall[]
  talentCalls    TalentCall[]

  @@unique([projectId, date])
  @@index([projectId])
}

model ProductionDayLocation {
  productionDayId String
  locationId      String

  productionDay ProductionDay @relation(fields: [productionDayId], references: [id], onDelete: Cascade)
  location      Location      @relation(fields: [locationId], references: [id])

  @@id([productionDayId, locationId])
}

model ScheduleBlock {
  id              String            @id @default(cuid())
  productionDayId String
  startTime       String            // "HH:MM"
  endTime         String            // "HH:MM"
  type            ScheduleBlockType
  label           String
  parallel        Boolean           @default(false)
  parallelGroupId String?           // groups simultaneous blocks for timeline rendering
  locationId      String?           // override location for this block
  notes           String?

  productionDay ProductionDay       @relation(fields: [productionDayId], references: [id], onDelete: Cascade)
  shots         ScheduleBlockShot[]

  @@index([productionDayId])
  @@index([parallelGroupId])
}

model ScheduleBlockShot {
  scheduleBlockId String
  shotId          String

  scheduleBlock ScheduleBlock @relation(fields: [scheduleBlockId], references: [id], onDelete: Cascade)
  shot          Shot          @relation(fields: [shotId], references: [id], onDelete: Cascade)

  @@id([scheduleBlockId, shotId])
}

model CrewCall {
  id              String      @id @default(cuid())
  productionDayId String
  personId        String?     // specific person OR...
  department      Department? // ...whole department (one of these is set)
  callTime        String      // "HH:MM"

  productionDay ProductionDay @relation(fields: [productionDayId], references: [id], onDelete: Cascade)
  person        Person?       @relation(fields: [personId], references: [id])

  @@index([productionDayId])
}

model TalentCall {
  id              String  @id @default(cuid())
  productionDayId String
  personId        String
  callTime        String
  makeupCallTime  String?
  onSetTime       String?
  wrapTime        String?

  productionDay ProductionDay @relation(fields: [productionDayId], references: [id], onDelete: Cascade)
  person        Person        @relation(fields: [personId], references: [id])

  @@index([productionDayId])
}

// ──────────────────────────────────────────────────────────────
// TASK
// ──────────────────────────────────────────────────────────────

model Task {
  id          String       @id @default(cuid())
  projectId   String
  personId    String?      // responsible Person (production entity)
  title       String
  description Json?        // RichText
  status      TaskStatus   @default(PENDING)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?

  // Polymorphic context — display only (any entity type)
  linkedEntityType String?
  linkedEntityId   String?

  // Direct FK shortcuts for most common task targets (Prisma-queryable)
  propId     String?
  locationId String?

  createdById  String
  assignedToId String?

  project    Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  person     Person?   @relation(fields: [personId], references: [id])
  prop       Prop?     @relation(fields: [propId], references: [id])
  location   Location? @relation(fields: [locationId], references: [id])
  createdBy  User      @relation("TaskCreatedBy", fields: [createdById], references: [id])
  assignedTo User?     @relation("TaskAssignedTo", fields: [assignedToId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId])
  @@index([personId])
  @@index([status])
  @@index([assignedToId])
  @@index([linkedEntityType, linkedEntityId])
}

// ──────────────────────────────────────────────────────────────
// MOODBOARD
// ──────────────────────────────────────────────────────────────

model MoodboardBoard {
  id     String  @id @default(cuid())
  title  String?
  layout String  @default("freeform") // "freeform" | "grid"

  projectId String? @unique
  sceneId   String? @unique

  project Project? @relation("ProjectMoodboard", fields: [projectId], references: [id], onDelete: Cascade)
  scene   Scene?   @relation("SceneMoodboard", fields: [sceneId], references: [id], onDelete: Cascade)

  items MoodboardItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model MoodboardItem {
  id      String            @id @default(cuid())
  boardId String
  type    MoodboardItemType
  assetId String?
  color   String?           // hex — for COLOR_SWATCH
  content String?           // text or URL
  caption String?
  posX    Float             @default(0)
  posY    Float             @default(0)
  width   Float             @default(200)
  height  Float             @default(200)
  order   Int               @default(0)

  board MoodboardBoard @relation(fields: [boardId], references: [id], onDelete: Cascade)
  asset Asset?         @relation(fields: [assetId], references: [id])

  @@index([boardId])
}

// ──────────────────────────────────────────────────────────────
// ASSET
// ──────────────────────────────────────────────────────────────

model Asset {
  id           String  @id @default(cuid())
  projectId    String
  filename     String
  mimeType     String
  size         Int     // bytes
  storagePath  String  // path in Supabase Storage bucket
  publicUrl    String
  alt          String?
  uploadedById String  // User.id

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Optional entity ownership — at most one is set
  shotId     String?
  personId   String?
  locationId String?
  stylingId  String?
  propId     String?

  shot     Shot?     @relation(fields: [shotId], references: [id])
  person   Person?   @relation(fields: [personId], references: [id])
  location Location? @relation(fields: [locationId], references: [id])
  styling  Styling?  @relation(fields: [stylingId], references: [id])
  prop     Prop?     @relation(fields: [propId], references: [id])

  moodboardItems MoodboardItem[]

  createdAt DateTime @default(now())

  @@index([projectId])
  @@index([shotId])
  @@index([personId])
  @@index([locationId])
}

// ──────────────────────────────────────────────────────────────
// CHANGELOG
// Auto-generated by Prisma $extends middleware on every mutation.
// diff: JSONPatch array — [{ op, path, value, oldValue }]
// ──────────────────────────────────────────────────────────────

model ChangeEntry {
  id           String       @id @default(cuid())
  projectId    String
  userId       String
  entityType   String       // Prisma model name: "Shot", "Prop", "Person"...
  entityId     String
  action       ChangeAction
  diff         Json?        // [{ op: "replace", path: "/status", value: "FILMED", oldValue: "NOT_FILMED" }]
  note         String?      // user comment on this change
  namedVersion String?      // optional snapshot label

  timestamp DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@index([projectId])
  @@index([entityType, entityId])
  @@index([userId])
  @@index([timestamp(sort: Desc)])
}

// ──────────────────────────────────────────────────────────────
// EXPORT JOB
// BullMQ processes these. Worker updates status + fileUrl on completion.
// ──────────────────────────────────────────────────────────────

model ExportJob {
  id          String          @id @default(cuid())
  projectId   String
  userId      String
  type        ExportType
  entityId    String?         // e.g. ProductionDay.id for CALL_SHEET
  status      ExportJobStatus @default(QUEUED)
  fileUrl     String?         // signed URL — TTL 1h (enforced at Storage level)
  error       String?
  createdAt   DateTime        @default(now())
  completedAt DateTime?

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@index([projectId])
  @@index([userId])
  @@index([status])
}
```
