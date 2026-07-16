import { useState } from "react"

const SMPTE = {
  white:   '#F0F0F0',
  yellow:  '#EFC000',
  cyan:    '#00D4DE',
  green:   '#00C853',
  magenta: '#CC00AA',
  red:     '#FF3530',
  blue:    '#2860FF',
}
const SMPTE_LIST = [SMPTE.white, SMPTE.yellow, SMPTE.cyan, SMPTE.green, SMPTE.magenta, SMPTE.red, SMPTE.blue]

const T = {
  display: "'Syne', sans-serif",
  mono:    "'DM Mono', monospace",
  body:    "'DM Sans', sans-serif",
}

const STATUS = {
  not_filmed:  { label: 'Not filmed',  color: SMPTE.blue,    bg: '#2860FF14' },
  in_progress: { label: 'In progress', color: SMPTE.yellow,  bg: '#EFC00014' },
  filmed:      { label: 'Filmed',      color: SMPTE.green,   bg: '#00C85314' },
  approved:    { label: 'Approved',    color: SMPTE.white,   bg: '#F0F0F014' },
  blocked:     { label: 'Blocked',     color: SMPTE.red,     bg: '#FF353014' },
  discarded:   { label: 'Discarded',   color: SMPTE.magenta, bg: '#CC00AA14' },
}

const SHOTS = [
  { id: '1A-01', scene: '1A', fs: 'WS',  mv: 'Static',    desc: 'Establishing. María stands alone at the edge of the rooftop, back to camera.',      loc: 'EXT. Rooftop',   dl: 'Night',  people: ['M. Vargas', 'B. Torres'], status: 'filmed',      eq: 'ARRI LF · 35mm',        notes: true  },
  { id: '1A-02', scene: '1A', fs: 'CU',  mv: 'Dolly in',  desc: 'Tight close-up on María\'s expression as she reads the message on her phone.',       loc: 'EXT. Rooftop',   dl: 'Night',  people: ['M. Vargas'],              status: 'filmed',      eq: 'ARRI LF · 85mm',        notes: false },
  { id: '1A-03', scene: '1A', fs: 'MCU', mv: 'Handheld',  desc: 'Carlos approaches from behind. Two-shot resolving into OTS over María\'s shoulder.', loc: 'EXT. Rooftop',   dl: 'Night',  people: ['M. Vargas', 'C. Medina'], status: 'in_progress', eq: 'ARRI LF · 50mm',        notes: true  },
  { id: '1B-01', scene: '1B', fs: 'ECU', mv: 'Static',    desc: 'Insert shot — phone screen with unread message notification glowing.',               loc: 'INT. Elevator',  dl: 'Night',  people: [],                         status: 'not_filmed',  eq: 'ARRI LF · 100mm Macro', notes: false },
  { id: '2A-01', scene: '2A', fs: 'LS',  mv: 'Drone',     desc: 'Aerial establishing. City at golden hour, slow push toward the building.',           loc: 'EXT. City',      dl: 'Sunset', people: [],                         status: 'blocked',     eq: 'DJI Inspire 3',         notes: true  },
]

const SCHEDULE_DAY_START = 6 * 60
const SCHEDULE_DAY_MINS  = 12 * 60
const SCHEDULE = [
  { time: '06:00', dur: 90,  label: 'Crew Call & Setup',       type: 'setup'    },
  { time: '07:30', dur: 30,  label: 'Hair & Makeup — Talent',  type: 'wardrobe' },
  { time: '08:00', dur: 150, label: 'Shooting — Scene 1A',     type: 'shoot'    },
  { time: '10:30', dur: 30,  label: 'Break',                   type: 'break'    },
  { time: '11:00', dur: 30,  label: 'Location Move',           type: 'travel'   },
  { time: '11:30', dur: 90,  label: 'Shooting — Scene 1B',     type: 'shoot'    },
  { time: '13:00', dur: 60,  label: 'Catering',                type: 'catering' },
  { time: '14:00', dur: 30,  label: 'Wardrobe Change',         type: 'wardrobe' },
  { time: '14:30', dur: 150, label: 'Shooting — Scene 2A',     type: 'shoot'    },
  { time: '17:00', dur: 60,  label: 'Wrap',                    type: 'wrap'     },
]
const SCHED_COL = {
  setup:    { bg: '#1A1A1A', border: '#2E2E2E',             text: '#555' },
  wardrobe: { bg: '#160B14', border: SMPTE.magenta + '44', text: SMPTE.magenta },
  shoot:    { bg: '#08111F', border: SMPTE.blue + '55',    text: SMPTE.blue },
  break:    { bg: '#111111', border: '#222',                text: '#3A3A3A' },
  travel:   { bg: '#061313', border: SMPTE.cyan + '44',    text: SMPTE.cyan },
  catering: { bg: '#141007', border: SMPTE.yellow + '44',  text: SMPTE.yellow },
  wrap:     { bg: '#101010', border: '#222',                text: '#3A3A3A' },
}

function toMins(t) { const [h,m] = t.split(':').map(Number); return h*60+m }

/* ── Atoms ───────────────────────────────────────────── */

const SmpteBar = ({ h = 4 }) => (
  <div style={{ display:'flex', height:h, width:'100%', flexShrink:0 }}>
    {SMPTE_LIST.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
  </div>
)

const Logo = ({ size = 'md' }) => {
  const sizes = { sm: { dot:4, gap:2, br:10, pr:10, word:20, sub:8, subTrack:'0.26em', subMt:4 },
                  md: { dot:6, gap:3, br:14, pr:14, word:30, sub:10, subTrack:'0.28em', subMt:5 },
                  lg: { dot:7, gap:3.5, br:18, pr:18, word:44, sub:11, subTrack:'0.30em', subMt:7 } }
  const s = sizes[size]
  return (
    <div style={{ display:'flex', alignItems:'center', gap: s.br }}>
      <div style={{ display:'flex', flexDirection:'column', gap:s.gap, paddingRight:s.pr, borderRight:'1px solid #1E1E1E', flexShrink:0 }}>
        {SMPTE_LIST.map((c,i) => (
          <div key={i} style={{ width:s.dot, height:s.dot, borderRadius:'50%', background:c, opacity:0.85 }} />
        ))}
      </div>
      <div>
        <div style={{ marginRight:`-0.28em` }}>
          <span style={{ fontFamily:T.display, fontWeight:700, fontSize:s.word, letterSpacing:'0.28em', color:'#F0F0F0', lineHeight:1, display:'block' }}>FRAME</span>
        </div>
        <div style={{ fontFamily:T.display, fontWeight:400, fontSize:s.sub, letterSpacing:s.subTrack, color:'#2A2A2A', textTransform:'uppercase', marginTop:s.subMt }}>
          Production Management
        </div>
      </div>
    </div>
  )
}

const StatusBadge = ({ status, size='sm' }) => {
  const s = STATUS[status]; if (!s) return null
  const pad = size==='sm' ? '2px 8px' : '3px 11px'
  const fs  = size==='sm' ? 9 : 11
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:pad, borderRadius:3,
      background:s.bg, border:`1px solid ${s.color}33`, color:s.color,
      fontFamily:T.display, fontWeight:600, fontSize:fs, letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:s.color, flexShrink:0 }} />
      {s.label}
    </span>
  )
}

const FsBadge = ({ fs }) => (
  <span style={{ fontFamily:T.mono, fontSize:10, color:SMPTE.cyan,
    background:SMPTE.cyan+'10', border:`1px solid ${SMPTE.cyan}28`,
    padding:'2px 7px', borderRadius:2, letterSpacing:'0.03em', whiteSpace:'nowrap' }}>{fs}</span>
)

const Avatar = ({ name }) => {
  const initials = name.split(' ').map(n=>n[0]).join('')
  const cols = [SMPTE.cyan, SMPTE.yellow, SMPTE.magenta, SMPTE.green, SMPTE.blue]
  const col  = cols[name.charCodeAt(0) % cols.length]
  return (
    <span title={name} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:22, height:22, borderRadius:'50%', background:col+'1E', border:`1px solid ${col}44`,
      color:col, fontSize:9, fontFamily:T.display, fontWeight:700, letterSpacing:'0.02em', flexShrink:0 }}>
      {initials}
    </span>
  )
}

const SectionLabel = ({ children }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
    <div style={{ width:3, height:13, background:SMPTE.cyan, borderRadius:1 }} />
    <span style={{ fontFamily:T.display, fontWeight:600, fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'#555' }}>
      {children}
    </span>
  </div>
)

/* ── Main ────────────────────────────────────────────── */

export default function FramePreview() {
  const [tab, setTab]           = useState('shotlist')
  const [selectedShot, setShot] = useState(null)
  const shot = SHOTS.find(s => s.id === selectedShot)

  const NAV = [
    { key:'branding',    label:'Design Language' },
    { key:'shotlist',    label:'Shot List' },
    { key:'schedule',    label:'Production Day' },
    { key:'components',  label:'Components' },
  ]

  return (
    <div style={{ background:'#090909', color:'#F0F0F0', minHeight:'100vh', fontFamily:T.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0D0D0D}
        ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px}
      `}</style>

      <SmpteBar h={4} />

      {/* Header */}
      <header style={{ padding:'36px 48px 28px', borderBottom:'1px solid #161616' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <Logo size="lg" />
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:T.mono, fontSize:9, color:'#2E2E2E', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>Active project</div>
            <div style={{ fontFamily:T.display, fontWeight:600, fontSize:15, color:'#BBB', letterSpacing:'0.04em' }}>Otra Vez — Spot Corporativo</div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8, alignItems:'center' }}>
              <StatusBadge status="in_progress" size="sm" />
              <span style={{ fontFamily:T.mono, fontSize:9, color:'#333' }}>Shoot in 12 days</span>
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ display:'flex', padding:'0 48px', borderBottom:'1px solid #161616' }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => { setTab(n.key); setShot(null) }} style={{
            background:'none', border:'none', cursor:'pointer', padding:'13px 18px',
            fontFamily:T.display, fontWeight:600, fontSize:10,
            letterSpacing:'0.12em', textTransform:'uppercase',
            color: tab===n.key ? '#DDD' : '#333',
            borderBottom: tab===n.key ? `2px solid ${SMPTE.cyan}` : '2px solid transparent',
            marginBottom:-1, transition:'color 0.12s',
          }}>{n.label}</button>
        ))}
      </nav>

      {/* ── DESIGN LANGUAGE ── */}
      {tab==='branding' && (
        <div style={{ padding:'40px 48px', display:'flex', flexDirection:'column', gap:52 }}>

          {/* Logo showcase */}
          <section>
            <SectionLabel>Wordmark</SectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
              {/* Large on dark */}
              <div style={{ background:'#0D0D0D', border:'1px solid #161616', borderRadius:6, padding:'48px 40px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Logo size="lg" />
              </div>
              {/* Small variants */}
              <div style={{ display:'flex', gap:0 }}>
                {['sm','md','lg'].map((sz,i) => (
                  <div key={sz} style={{ flex:1, padding:'24px 28px', borderRight: i<2 ? '1px solid #161616':'none',
                    background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Logo size={sz} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Colour system */}
          <section>
            <SectionLabel>Color System</SectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:9, color:'#2E2E2E', letterSpacing:'0.14em', marginBottom:14 }}>BASE SURFACES</div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {[['#090909','bg-base'],['#131313','bg-surface'],['#1C1C1C','bg-elevated'],['#252525','bg-overlay'],
                    ['#2A2A2A','border-subtle'],['#383838','border-default'],['#4A4A4A','text-disabled'],
                    ['#666666','text-muted'],['#999999','text-secondary'],['#F0F0F0','text-primary']
                  ].map(([hex,name]) => (
                    <div key={name} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7 }}>
                      <div style={{ width:56, height:56, borderRadius:4, background:hex, border:'1px solid #1E1E1E' }} />
                      <div style={{ fontFamily:T.mono, fontSize:8, color:'#333', textAlign:'center' }}>
                        <div style={{ color:'#444', marginBottom:2 }}>{hex}</div>
                        <div style={{ fontSize:7, color:'#2A2A2A' }}>{name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily:T.mono, fontSize:9, color:'#2E2E2E', letterSpacing:'0.14em', marginBottom:12 }}>SMPTE SEMANTIC</div>
                <div style={{ display:'flex', gap:0, height:6, marginBottom:14, borderRadius:2, overflow:'hidden' }}>
                  {SMPTE_LIST.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {[
                    [SMPTE.white,  'White',   'Approved · Confirmed'],
                    [SMPTE.yellow, 'Yellow',  'In progress · Warning'],
                    [SMPTE.cyan,   'Cyan',    'Camera · Photography'],
                    [SMPTE.green,  'Green',   'Filmed · Done'],
                    [SMPTE.magenta,'Magenta', 'Styling · Art · Wardrobe'],
                    [SMPTE.red,    'Red',     'Blocked · Urgent'],
                    [SMPTE.blue,   'Blue',    'Production · Scheduled'],
                  ].map(([hex,name,use]) => (
                    <div key={name} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ width:76, height:52, borderRadius:4, background:hex+'16', border:`1px solid ${hex}38`,
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', background:hex }} />
                      </div>
                      <div style={{ fontFamily:T.mono, fontSize:8, color:'#333', width:76 }}>
                        <div style={{ color:hex, marginBottom:2, fontWeight:500 }}>{hex}</div>
                        <div style={{ fontSize:7, color:'#2E2E2E', lineHeight:1.4 }}>{use}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section>
            <SectionLabel>Typography</SectionLabel>
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {[
                { font:T.display, w:700, sz:36, tag:'Display — Syne 700', sample:'Pre-Production', sub:'Wordmark, module headers, section titles' },
                { font:T.display, w:600, sz:12, tag:'UI Label — Syne 600', sample:'SHOT LIST  ·  SCENE BREAKDOWN  ·  CALL SHEET', sub:'Navigation, buttons, badges, status chips', upper:true },
                { font:T.mono,    w:400, sz:13, tag:'Data — DM Mono 400', sample:'1A-03  ·  MCU  ·  50mm  ·  08:00 – 10:30  ·  f/2.8', sub:'Shot numbers, lenses, timecodes, camera data' },
                { font:T.body,    w:400, sz:13, tag:'Body — DM Sans 400', sample:'Carlos approaches from behind. Two-shot resolving into OTS.', sub:'Descriptions, notes, body copy' },
              ].map(row => (
                <div key={row.tag} style={{ display:'flex', gap:28, alignItems:'baseline', padding:'16px 0', borderBottom:'1px solid #141414', flexWrap:'wrap' }}>
                  <div style={{ width:200, flexShrink:0 }}>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:'#2E2E2E', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>{row.tag}</div>
                    <div style={{ fontFamily:T.mono, fontSize:8, color:'#222' }}>{row.sub}</div>
                  </div>
                  <div style={{ fontFamily:row.font, fontWeight:row.w, fontSize:row.sz, color:'#CCCCCC',
                    letterSpacing: row.upper ? '0.12em' : '0.01em',
                    textTransform: row.upper ? 'uppercase' : 'none', flex:1 }}>
                    {row.sample}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── SHOT LIST ── */}
      {tab==='shotlist' && (
        <div style={{ display:'flex', height:'calc(100vh - 178px)' }}>
          <div style={{ flex:1, overflow:'auto' }}>
            {/* Col headers */}
            <div style={{ display:'grid', gridTemplateColumns:'76px 46px 84px 108px 1fr 128px 108px 108px 28px',
              gap:12, padding:'10px 20px 10px 48px',
              position:'sticky', top:0, background:'#0C0C0C', zIndex:10, borderBottom:'1px solid #161616' }}>
              {['Shot #','FS','Movement','Equipment','Description','Location','People','Status',''].map((h,i) => (
                <div key={i} style={{ fontFamily:T.mono, fontSize:8, color:'#333', letterSpacing:'0.14em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h}</div>
              ))}
            </div>

            {['1A','1B','2A'].map(scene => {
              const rows = SHOTS.filter(s => s.scene===scene)
              return (
                <div key={scene}>
                  <div style={{ padding:'7px 48px', background:'#0C0C0C', borderBottom:'1px solid #161616', borderTop:'1px solid #0E0E0E',
                    display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:3, height:12, background:SMPTE.blue, borderRadius:1 }} />
                    <span style={{ fontFamily:T.display, fontWeight:600, fontSize:10, color:'#555', letterSpacing:'0.14em' }}>SCENE {scene}</span>
                    <span style={{ fontFamily:T.mono, fontSize:9, color:'#2E2E2E' }}>{rows[0]?.loc} · {rows[0]?.dl}</span>
                    <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:9, color:'#252525' }}>{rows.length} shots</span>
                  </div>
                  {rows.map(s => {
                    const isSel = selectedShot===s.id
                    return (
                      <div key={s.id} onClick={() => setShot(isSel ? null : s.id)}
                        style={{ display:'grid', gridTemplateColumns:'76px 46px 84px 108px 1fr 128px 108px 108px 28px',
                          gap:12, padding:'12px 20px 12px 48px',
                          borderBottom:'1px solid #111',
                          borderLeft: isSel ? `3px solid ${SMPTE.blue}` : '3px solid transparent',
                          background: isSel ? '#0C1521' : 'transparent',
                          cursor:'pointer', alignItems:'center', transition:'background 0.1s' }}
                        onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='#0F0F0F' }}
                        onMouseLeave={e => { if(!isSel) e.currentTarget.style.background='transparent' }}>
                        <div style={{ fontFamily:T.mono, fontSize:12, color:'#AAA', letterSpacing:'0.03em' }}>{s.id}</div>
                        <div><FsBadge fs={s.fs} /></div>
                        <div style={{ fontFamily:T.body, fontSize:12, color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.mv}</div>
                        <div style={{ fontFamily:T.mono, fontSize:9, color:'#3A3A3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.eq}</div>
                        <div style={{ fontFamily:T.body, fontSize:13, color:'#999', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.desc}</div>
                        <div style={{ fontFamily:T.mono, fontSize:9, color:'#3A3A3A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.loc}</div>
                        <div style={{ display:'flex', gap:3 }}>{s.people.length ? s.people.map(p => <Avatar key={p} name={p} />) : <span style={{ fontFamily:T.mono, fontSize:9, color:'#222' }}>—</span>}</div>
                        <div><StatusBadge status={s.status} /></div>
                        <div style={{ display:'flex', justifyContent:'center' }}>
                          {s.notes && <div style={{ width:4, height:4, borderRadius:'50%', background:SMPTE.yellow }} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Footer stats */}
            <div style={{ padding:'14px 48px', borderTop:'1px solid #141414', display:'flex', gap:20, flexWrap:'wrap' }}>
              {Object.entries(SHOTS.reduce((a,s) => { a[s.status]=(a[s.status]||0)+1; return a }, {})).map(([st,n]) => (
                <div key={st} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:STATUS[st].color }} />
                  <span style={{ fontFamily:T.mono, fontSize:9, color:'#3A3A3A' }}>{n} {STATUS[st].label.toLowerCase()}</span>
                </div>
              ))}
              <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:9, color:'#252525' }}>{SHOTS.length} total shots</span>
            </div>
          </div>

          {/* Detail panel */}
          {shot && (
            <div style={{ width:300, borderLeft:'1px solid #161616', background:'#0C0C0C', padding:'22px 18px', overflow:'auto', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:T.mono, fontSize:20, color:'#EEE', letterSpacing:'0.03em', marginBottom:8 }}>{shot.id}</div>
                  <StatusBadge status={shot.status} size="md" />
                </div>
                <button onClick={() => setShot(null)} style={{ background:'none', border:'none', color:'#333', cursor:'pointer', fontSize:20, lineHeight:1, padding:4 }}>×</button>
              </div>
              <SmpteBar h={2} />
              <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:16 }}>
                <Field label="Description"><span style={{ fontFamily:T.body, fontSize:12, color:'#888', lineHeight:1.5 }}>{shot.desc}</span></Field>
                <div style={{ display:'flex', gap:12 }}>
                  <Field label="Frame Size"><FsBadge fs={shot.fs} /></Field>
                  <Field label="Movement"><span style={{ fontFamily:T.mono, fontSize:11, color:'#666' }}>{shot.mv}</span></Field>
                </div>
                <Field label="Equipment"><span style={{ fontFamily:T.mono, fontSize:11, color:'#555' }}>{shot.eq}</span></Field>
                <Field label="Location"><span style={{ fontFamily:T.mono, fontSize:11, color:'#555' }}>{shot.loc} · {shot.dl}</span></Field>
                {shot.people.length > 0 && (
                  <Field label="People">
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {shot.people.map(p => (
                        <div key={p} style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar name={p} />
                          <span style={{ fontFamily:T.body, fontSize:12, color:'#666' }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </Field>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTION DAY ── */}
      {tab==='schedule' && (
        <div style={{ padding:'36px 48px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32, flexWrap:'wrap', gap:16 }}>
            <div>
              <SectionLabel>Production Day</SectionLabel>
              <div style={{ fontFamily:T.mono, fontSize:10, color:'#444', marginTop:2 }}>Shoot Day 01 · Sat Jun 14 · General call 06:00</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {[[SMPTE.blue,'2 Locations'],[SMPTE.white,'8 Crew'],[SMPTE.magenta,'2 Talent']].map(([c,l]) => (
                <span key={l} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:3,
                  background:c+'12', border:`1px solid ${c}30`, color:c,
                  fontFamily:T.display, fontWeight:600, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:c }} />{l}
                </span>
              ))}
            </div>
          </div>

          {/* Hour ruler */}
          <div style={{ display:'flex', marginLeft:106, marginBottom:4 }}>
            {Array.from({length:13},(_,i)=>i+6).map(h => (
              <div key={h} style={{ flex:1, fontFamily:T.mono, fontSize:8, color:'#252525', letterSpacing:'0.06em' }}>
                {String(h).padStart(2,'0')}:00
              </div>
            ))}
          </div>

          {/* Blocks */}
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {SCHEDULE.map((blk,i) => {
              const startM = toMins(blk.time) - SCHEDULE_DAY_START
              const left   = (startM / SCHEDULE_DAY_MINS) * 100
              const width  = (blk.dur / SCHEDULE_DAY_MINS) * 100
              const col    = SCHED_COL[blk.type]
              const endM   = toMins(blk.time) + blk.dur
              const endStr = `${String(Math.floor(endM/60)).padStart(2,'0')}:${String(endM%60).padStart(2,'0')}`
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:94, flexShrink:0, textAlign:'right', fontFamily:T.mono, fontSize:9, color:'#2E2E2E', letterSpacing:'0.04em' }}>
                    {blk.time}<span style={{ color:'#1C1C1C' }}> → </span>{endStr}
                  </div>
                  <div style={{ flex:1, position:'relative', height:36, background:'#0E0E0E', borderRadius:2, overflow:'hidden' }}>
                    {Array.from({length:11},(_,j) => (
                      <div key={j} style={{ position:'absolute', left:`${(j/12)*100}%`, top:0, bottom:0, width:1, background:'#151515' }} />
                    ))}
                    <div style={{ position:'absolute', left:`${left}%`, width:`${width}%`, top:3, bottom:3,
                      background:col.bg, border:`1px solid ${col.border}`, borderRadius:2,
                      display:'flex', alignItems:'center', padding:'0 10px', overflow:'hidden', minWidth:0 }}>
                      <span style={{ fontFamily:T.display, fontWeight:600, fontSize:9, color:col.text,
                        letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {blk.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Call times */}
          <div style={{ marginTop:40 }}>
            <SectionLabel>Call Times</SectionLabel>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                ['Production Crew','06:00', SMPTE.blue],
                ['Camera Dept.','06:30', SMPTE.cyan],
                ['Art & Wardrobe','06:30', SMPTE.magenta],
                ['Sound','07:00', SMPTE.green],
                ['M. Vargas — Talent','07:30', SMPTE.yellow],
                ['C. Medina — Talent','09:30', SMPTE.yellow],
              ].map(([dept,time,color]) => (
                <div key={dept} style={{ background:'#0E0E0E', border:'1px solid #161616', borderRadius:4,
                  padding:'11px 16px', display:'flex', gap:14, alignItems:'center', minWidth:190 }}>
                  <div style={{ width:3, height:30, background:color, borderRadius:1, flexShrink:0 }} />
                  <div>
                    <div style={{ fontFamily:T.display, fontWeight:600, fontSize:9, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>{dept}</div>
                    <div style={{ fontFamily:T.mono, fontSize:17, color:color, letterSpacing:'0.04em' }}>{time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPONENTS ── */}
      {tab==='components' && (
        <div style={{ padding:'36px 48px', display:'flex', flexDirection:'column', gap:44 }}>

          <section>
            <SectionLabel>Buttons</SectionLabel>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              {[
                { label:'Add Shot',       bg:'#F0F0F0', color:'#090909', border:'transparent' },
                { label:'Export PDF',     bg:'#131313', color:'#F0F0F0', border:'#2A2A2A' },
                { label:'Save Changes',   bg:SMPTE.blue+'1E', color:SMPTE.blue, border:SMPTE.blue+'44' },
                { label:'Mark as Filmed', bg:SMPTE.green+'18', color:SMPTE.green, border:SMPTE.green+'44' },
                { label:'Flag Blocked',   bg:SMPTE.red+'16', color:SMPTE.red, border:SMPTE.red+'40' },
                { label:'Discard',        bg:'transparent', color:'#333', border:'transparent' },
              ].map(b => (
                <button key={b.label} style={{ background:b.bg, color:b.color, border:`1px solid ${b.border}`,
                  padding:'9px 18px', borderRadius:4, cursor:'pointer',
                  fontFamily:T.display, fontWeight:600, fontSize:10,
                  letterSpacing:'0.1em', textTransform:'uppercase' }}>{b.label}</button>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Status Chips</SectionLabel>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {Object.keys(STATUS).map(k => <StatusBadge key={k} status={k} size="md" />)}
            </div>
          </section>

          <section>
            <SectionLabel>Department Tags</SectionLabel>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {[['Direction',SMPTE.white],['Production',SMPTE.blue],['Photography',SMPTE.cyan],
                ['Art / Deco',SMPTE.magenta],['Wardrobe',SMPTE.magenta],['Sound',SMPTE.green],
                ['Post',SMPTE.green],['Talent',SMPTE.yellow],['Client',SMPTE.white]].map(([l,c]) => (
                <span key={l} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:3,
                  background:c+'14', border:`1px solid ${c}30`, color:c,
                  fontFamily:T.display, fontWeight:600, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:c }} />{l}
                </span>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Frame Size Indicators</SectionLabel>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
              {['ECU','CU','MCU','MS','MLS','LS','ELS','POV','OTS','INSERT','AERIAL'].map(fs => <FsBadge key={fs} fs={fs} />)}
            </div>
          </section>

          <section>
            <SectionLabel>Form Inputs</SectionLabel>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-end' }}>
              {[
                { label:'Shot Name', val:'Dolly reveal — rooftop', w:220, font:T.body, color:'#F0F0F0', border:'#2A2A2A' },
                { label:'Lens',      val:'85mm',                   w:110, font:T.mono, color:SMPTE.cyan, border:SMPTE.cyan+'40' },
              ].map(f => (
                <div key={f.label} style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontFamily:T.mono, fontSize:8, color:'#2E2E2E', letterSpacing:'0.14em', textTransform:'uppercase' }}>{f.label}</label>
                  <input defaultValue={f.val} style={{ background:'#111', border:`1px solid ${f.border}`, color:f.color,
                    padding:'9px 12px', borderRadius:4, width:f.w, fontFamily:f.font, fontSize:13, outline:'none' }} />
                </div>
              ))}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontFamily:T.mono, fontSize:8, color:'#2E2E2E', letterSpacing:'0.14em', textTransform:'uppercase' }}>Status</label>
                <select style={{ background:'#111', border:'1px solid #2A2A2A', color:'#666',
                  padding:'9px 12px', borderRadius:4, width:150,
                  fontFamily:T.display, fontWeight:600, fontSize:10, outline:'none', cursor:'pointer' }}>
                  {Object.entries(STATUS).map(([k,v]) => <option key={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          </section>
        </div>
      )}

      <SmpteBar h={3} />
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontFamily:"'DM Mono', monospace", fontSize:8, color:'#2A2A2A', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      {children}
    </div>
  )
}
