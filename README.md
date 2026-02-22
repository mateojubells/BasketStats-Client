# 🏀 BasketStats-Client

Una aplicación web moderna para visualización, análisis y scouting de estadísticas de baloncesto de la FEB (Federación Española de Baloncesto). Construida con Next.js, TypeScript y Tailwind CSS.

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Quick Start](#quick-start)
- [Variables de Entorno](#variables-de-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Scripts Disponibles](#scripts-disponibles)
- [Arquitectura](#arquitectura)
- [Características](#características)
- [Integración API](#integración-api)
- [Deployment](#deployment)
- [Contribuir](#contribuir)
- [Repositorio Relacionado](#repositorio-relacionado)
- [Troubleshooting](#troubleshooting)
- [Licencia](#licencia)

---

## 📖 Introducción

**BasketStats-Client** es una plataforma de análisis de baloncesto diseñada para:

- **Scouts**: Análisis defensivo, comparativas de sinergias, identificación de amenazas clave
- **Analistas**: Tendencias de jugadores, análisis de clutch time, cuatro factores del baloncesto
- **Entrenadores**: Visualización de partidos completos, gráficos de tiro, calendarios de equipo
- **Aficionados**: Dashboard con KPIs, estadísticas en tiempo real, pronósticos de victoria

La aplicación se conecta exclusivamente con **Supabase** para lectura de datos, proporcionando una separación clara entre frontend y la gestión de datos (realizada por [BasketStats-Admin](https://github.com/tu-usuario/BasketStats-Admin)).

### 🎯 Casos de Uso

- Análisis pre-partido: Scouting y matchups defensivos
- Análisis en vivo: Play-by-play, boxes score y gráficos de tiro
- Seguimiento de jugadores: Tendencias, impacto, cuadros de control
- Consultas IA: ChatBot HoopsAI para preguntas rápidas sobre estadísticas

---

## 🚀 Quick Start

### Requisitos Previos

- **Node.js**: v18.17 o superior
- **pnpm**: v8 o superior (recomendado) o npm/yarn
- Acceso a credenciales de **Supabase** (proyecto FEB)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/BasketStats-Client.git
cd BasketStats-Client
```

### 2. Instalar dependencias

```bash
pnpm install
```

O con npm:

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` y completa con tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores (ver [Variables de Entorno](#variables-de-entorno)):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

### 4. Ejecutar servidor de desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🔐 Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI API (para HoopsAI Chatbot)
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...

# Analytics (opcional)
NEXT_PUBLIC_ANALYTICS_ID=UA-...
```

### Descripción de Variables

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase (cliente público) | ✅ |
| `NEXT_PUBLIC_OPENAI_API_KEY` | Clave API de OpenAI para chatbot | ✅ |
| `NEXT_PUBLIC_ANALYTICS_ID` | ID de Google Analytics | ❌ |

⚠️ **Nota**: Las variables con prefijo `NEXT_PUBLIC_` son expuestas en el navegador. **Nunca incluyas secretos sensibles** (tokens privados, claves administrativas).

---

## 📁 Estructura del Proyecto

```
BasketStats-Client/
├── app/                          # App Router de Next.js
│   ├── layout.tsx               # Layout raíz
│   ├── page.tsx                 # Página principal (dashboard)
│   ├── login/                   # Autenticación
│   ├── player/                  # Análisis de jugadores
│   ├── teams/                   # Gestión de equipos
│   ├── game-center/             # Visualización de partidos
│   ├── scouting/                # Herramientas de scouting
│   ├── calendar/                # Calendario de partidos
│   ├── chat/                    # Chat con HoopsAI
│   └── api/chat/                # API interna para chatbot
│
├── components/                   # Componentes React reutilizables
│   ├── ui/                      # Componentes base (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx
│   │   └── [otros...]
│   ├── dashboard/               # Componentes del dashboard
│   ├── game-center/             # Componentes de visualización de partidos
│   ├── player/                  # Componentes de análisis de jugadores
│   ├── scouting/                # Componentes de scouting
│   ├── teams/                   # Componentes de equipos
│   ├── chatbot/                 # HoopsAI chatbot
│   └── [componentes principales]
│
├── hooks/                       # Custom React hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
│
├── lib/                         # Utilidades y configuración
│   ├── api.ts                   # Cliente API (queries a Supabase)
│   ├── supabase.ts              # Configuración de Supabase
│   ├── auth-context.tsx         # Contexto de autenticación
│   ├── types.ts                 # Tipos TypeScript compartidos
│   ├── utils.ts                 # Utilidades generales
│   ├── ai-service.ts            # Integración con OpenAI
│   ├── data.ts                  # Datos mock/transformación
│   └── gemini.ts                # Servicios de Gemini (si aplica)
│
├── tailwind.config.ts           # Configuración de Tailwind CSS v4
├── next.config.mjs              # Configuración de Next.js
├── tsconfig.json                # Configuración de TypeScript
├── package.json                 # Dependencias
└── README.md                    # Este archivo
```

---

## ⚙️ Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia servidor en http://localhost:3000

# Producción
pnpm build            # Compila para producción
pnpm start            # Inicia servidor de producción

# Análisis y Calidad
pnpm lint             # Ejecuta ESLint
pnpm type-check       # Verifica tipos TypeScript

# Limpieza
pnpm clean            # Limpia .next y node_modules
```

### Ejemplos de Uso

```bash
# Desarrollo con hot-reload
pnpm dev

# Compilar y verificar errores antes de deploy
pnpm build && pnpm start

# Verificar tipos antes de commit
pnpm type-check && pnpm lint
```

---

## 🏗️ Arquitectura

### Flujo de Datos

```
Frontend (Next.js/React)
       ↓
   lib/api.ts (Cliente Supabase)
       ↓
   Supabase (PostgreSQL)
       ↓
   BasketStats-Admin (maneja inserciones/actualizaciones)
```

### Principios de Diseño

1. **Lectura Únicamente**: BasketStats-Client **solo lee** de Supabase. No inserta, actualiza ni elimina datos.
2. **Separación de Responsabilidades**: [BasketStats-Admin](https://github.com/tu-usuario/BasketStats-Admin) gestiona datos; este repo solo visualiza.
3. **Tipado Fuerte**: TypeScript en 100% del código para máxima seguridad.
4. **Componentes Modulares**: shadcn/ui + componentes custom, fáciles de mantener y reutilizar.

### Módulos Clave

- **`lib/api.ts`**: Encapsula todas las queries a Supabase. Punto central para cambios en estructura de datos.
- **`lib/auth-context.tsx`**: Maneja sesiones de usuario vía Supabase Auth.
- **`components/ui/chart.tsx`**: Wrapper de Recharts con estilos personalizados.
- **`components/chatbot/hoops-ai-chat.tsx`**: Integración con OpenAI para consultas de estadísticas.

---

## ✨ Características

### 📊 Dashboard
- KPIs de jugadores y equipos
- Gráficos de tendencias en tiempo real
- Resumen de próximos partidos
- Jugador de la semana

### 🎯 Análisis de Partidos
- **Box Score**: Estadísticas completas jugador por jugador
- **Play-by-Play**: Momento a momento del partido
- **Shooting Charts**: Gráficos de efectividad de tiro (FEB)
- **Scoring Runs**: Rachas de puntuación
- **Win Probability**: Pronóstico de victoria en tiempo real

### 👤 Análisis de Jugadores
- Tendencias históricas (puntos, rebotes, asistencias)
- Análisis **Clutch Time** (últimos 5 minutos decisivos)
- **Impact Score**: Métricas de impacto agregadas
- **Skill Analysis**: Análisis de habilidades específicas
- Comparación de sinergias con compañeros

### 🔍 Scouting Avanzado
- **Análisis Defensivo**: Brechas defensivas por posición
- **Comparativa de Sinergias**: Cómo trabajan juntos los jugadores
- **Amenazas Clave**: Identificación de puntuadores principales
- **Historial de Matchups**: Desempeño en enfrentamientos previos
- **Análisis de Cuatro Factores**: Efidencia ofensiva, rebote, turnovers, tiros libres

### ⚙️ Gestión de Equipos
- Plantillas y alineaciones
- Análisis de estadísticas agregadas
- Gráficos de tiro a nivel de equipo
- Lineup analysis

### 📅 Calendario
- Partidos próximos y pasados
- Filtrado por equipo/fecha
- Integración con game-center

### 💬 HoopsAI Chatbot
- Consultas sobre estadísticas en lenguaje natural
- Integración con OpenAI GPT-4
- Contexto de datos de Supabase
- Respuestas personalizadas por equipo/jugador

---

## 🔌 Integración API

### Estructura de `lib/api.ts`

La capa de API de BasketStats-Client encapsula todas las queries a Supabase:

```typescript
import { supabase } from './supabase';

// Ejemplo: Obtener estadísticas de un jugador
export async function getPlayerStats(playerId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*, games(*)')
    .eq('id', playerId);
  
  if (error) throw new Error(error.message);
  return data;
}

// Ejemplo: Obtener box score de un partido
export async function getGameBoxScore(gameId: string) {
  const { data, error } = await supabase
    .from('game_stats')
    .select('*')
    .eq('game_id', gameId);
  
  if (error) throw new Error(error.message);
  return data;
}
```

### Agregar una Nueva Query

1. **Define el tipo en `lib/types.ts`**:

```typescript
export interface PlayerTendency {
  date: string;
  points: number;
  rebounds: number;
  assists: number;
}
```

2. **Agrega la función en `lib/api.ts`**:

```typescript
export async function getPlayerTendencies(playerId: string) {
  const { data, error } = await supabase
    .from('player_tendencies')
    .select('*')
    .eq('player_id', playerId)
    .order('date', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data as PlayerTendency[];
}
```

3. **Úsalo en un componente**:

```typescript
import { getPlayerTendencies } from '@/lib/api';

export default function TrendsComponent({ playerId }: { playerId: string }) {
  const [data, setData] = useState<PlayerTendency[]>([]);

  useEffect(() => {
    getPlayerTendencies(playerId).then(setData);
  }, [playerId]);

  return <Chart data={data} />;
}
```

### Cambios en Estructura de Datos

Si **BasketStats-Admin** modifica la estructura de tablas en Supabase:

1. Actualiza los tipos en `lib/types.ts`
2. Modifica las queries en `lib/api.ts`
3. Actualiza componentes que usen esos datos
4. Ejecuta `pnpm type-check` para validar

---

## 🚀 Deployment

### Despliegue en Vercel (Recomendado)

1. **Conecta tu repositorio a Vercel**:
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard)
   - Click en "Add New..." → "Project"
   - Selecciona tu repositorio de GitHub

2. **Configura variables de entorno**:
   - Ve a Settings → Environment Variables
   - Agrega las variables del `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     NEXT_PUBLIC_OPENAI_API_KEY
     ```

3. **Deploy**:
   ```bash
   git push origin main
   ```
   Vercel auto-compila y despliega.

### Despliegue en Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

Deploy:

```bash
docker build -t basketstats-client .
docker run -e NEXT_PUBLIC_SUPABASE_URL=... -p 3000:3000 basketstats-client
```

---

## 🤝 Contribuir

Agradecemos contribuciones 💙. Sigue estos pasos:

### Flujo de Trabajo

1. **Fork** el repositorio
2. Crea una rama feature:
   ```bash
   git checkout -b feature/mi-feature
   ```
3. Realiza cambios y prueba:
   ```bash
   pnpm dev
   ```
4. Verifica tipos y lint:
   ```bash
   pnpm type-check && pnpm lint
   ```
5. Commit con mensajes descriptivos:
   ```bash
   git commit -m "feat: agregar análisis de clutch time"
   ```
6. Push y crea un Pull Request:
   ```bash
   git push origin feature/mi-feature
   ```

### Convenciones

- **Commits**: Usa [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` - Nueva funcionalidad
  - `fix:` - Bug fix
  - `docs:` - Cambios en documentación
  - `style:` - Formateo (sin cambios lógicos)
  - `refactor:` - Refactorización
- **Componentes**: Usa PascalCase, define props con interfaces
- **Archivos**: Usa kebab-case para nombres de archivos

---

## 🔗 Repositorio Relacionado

**[BasketStats-Admin](https://github.com/tu-usuario/BasketStats-Admin)** (Administración de Datos)

- **Lenguaje**: Python + Streamlit
- **Responsabilidad**: Inserción, actualización y validación de datos
- **Datos**: Comunica exclusivamente con Supabase

**Nota sobre Separación**: BasketStats-Client y BasketStats-Admin son repositorios **independientes** sin acoplamiento de código. La comunicación es únicamente a través de Supabase. Esto permite:
- Escalabilidad independiente
- Cambios en Admin sin afectar Client
- Equipos trabajando en paralelo

---

## 🛠️ Troubleshooting

### ❌ Error: "Supabase not configured"

**Causa**: Variables de entorno faltantes.

**Solución**:
```bash
# Verifica que .env.local exista y contenga:
cat .env.local
# Debe tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY

# Reinicia el servidor
pnpm dev
```

### ❌ Error: "Authentication failed"

**Causa**: Credenciales de Supabase incorrectas o sesión expirada.

**Solución**:
```bash
# Verifica credenciales en Supabase Dashboard
# Limpia caché local
rm -rf .next node_modules
pnpm install
pnpm dev
```

### ❌ Error: "Module not found"

**Causa**: Dependencias incompletas o versión de Node.js incompatible.

**Solución**:
```bash
# Verifica Node.js v18+
node --version

# Reinstala dependencias
pnpm install
pnpm build
```

### ❌ Componentes no se actualizan

**Causa**: Hot reload fallido o caché de navegador.

**Solución**:
```bash
# Hard refresh en navegador (Ctrl+Shift+R o Cmd+Shift+R)
# O limpia caché Next.js
rm -rf .next
pnpm dev
```

### ❌ Errores de TypeScript

**Causa**: Tipos desactualizados o cambios en Supabase.

**Solución**:
```bash
# Regenera tipos de Supabase
pnpm type-check

# Si hay discrepancias, actualiza lib/types.ts
# Asegúrate que columnas en Supabase coincidan con tipos
```

---

## 📄 Licencia

Este proyecto está bajo licencia **MIT**. Ver [LICENSE](./LICENSE) para más detalles.

---

## 📞 Soporte

- **Issues**: Abre un issue en el repositorio si encuentras bugs
- **Discussions**: Usa Discussions para preguntas y debates
- **Email**: [tu-email@ejemplo.com]

---

**Hecho con ❤️ para la comunidad de baloncesto.**
