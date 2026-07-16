import { useState } from "react"
import {
  Film, FileText, List, Users, MapPin, Layers, Package, Camera,
  Calendar, Download, Sliders, Image, Check, ChevronRight,
  AlertCircle, Clock, FolderOpen
} from "lucide-react"

const S = { white:'#F0F0F0', yellow:'#EFC000', cyan:'#00D4DE', green:'#00C853', magenta:'#CC00AA', red:'#FF3530', blue:'#2860FF' }
const BAR = [S.white, S.yellow, S.cyan, S.green, S.magenta, S.red, S.blue]
const T = { d:"'Syne',sans-serif", m:"'DM Mono',monospace", b:"'DM Sans',sans-serif" }

const MODULES = [
  { icon:Film,      color:S.blue,    name:'Project',         desc:'One workspace for the whole production. Client, team, dates, and every deliverable — always in sync.' },
  { icon:FileText,  color:S.white,   name:'Script',          desc:'Write your screenplay right where you plan your shots. Scene blocks link directly to your shot list.' },
  { icon:List,      color:S.blue,    name:'Shot List',       desc:'The most complete shot list you\'ve used. Frame, lens, talent, props, emotions — all in one row.' },
  { icon:Users,     color:S.yellow,  name:'Persons',         desc:'Talent, crew, and clients — each with their profile, call time, and a personal task board.' },
  { icon:MapPin,    color:S.cyan,    name:'Locations',       desc:'Scout, pin, permit, and document every location with photos, coordinates, and access notes.' },
  { icon:Layers,    color:S.magenta, name:'Styling',         desc:'One look per character per scene. Garments, accessories, hair, and makeup with visual references.' },
  { icon:Package,   color:S.magenta, name:'Props',           desc:'From searching to on set and returned. Every prop tracked, with the scenes and shots it appears in.' },
  { icon:Camera,    color:S.cyan,    name:'Equipment',       desc:'Cameras, lenses, and grip tracked by type, assignment, and rental source — nothing gets lost.' },
  { icon:Calendar,  color:S.blue,    name:'Production Day',  desc:'Build your call sheet visually. Set call times per department, parallel activities, and catering.' },
  { icon:Image,     color:S.magenta, name:'Moodboard',       desc:'Visual reference boards per project and per scene. Drag images, add swatches, pin ideas freely.' },
  { icon:Sliders,   color:S.green,   name:'Slate Generator', desc:'Auto-fills from your shot data. Export a print-ready PDF or a PNG overlay for post-production.' },
  { icon:Download,  color:S.white,   name:'Exports',         desc:'Call sheets, shot lists, breakdowns, and production schedules. One click to a professional PDF.' },
]

const PROBLEMS = [
  { icon:FolderOpen,   color:S.yellow, title:'Production scattered across tools', desc:'Shot lists in spreadsheets. Call sheets in Word. Moodboards in Pinterest. References in WhatsApp. Nothing talks to anything.' },
  { icon:AlertCircle,  color:S.red,    title:'Changes break everything downstream', desc:'Update a location and three PDFs are outdated. Add a prop and no one knows which shots it\'s in. You find out on set.' },
  { icon:Clock,        color:S.cyan,   title:'Hours lost rebuilding the same documents', desc:'Every new project starts from zero. The same call sheet template, the same shot list columns, the same lost time.' },
]

const ROLES = [
  { role:'Director / Producer', color:S.white,   gets:['Full project overview at a glance','Shot list with visual references','Changelog to track every decision'] },
  { role:'1st AD',              color:S.blue,    gets:['Day schedule with parallel blocks','Call times per person and department','One-click call sheet export'] },
  { role:'Director of Photography', color:S.cyan, gets:['Camera data per shot: lens, movement, angle','Equipment inventory and assignments','Reference images attached to each shot'] },
  { role:'Art / Stylist',       color:S.magenta, gets:['Look per character per scene','Props with full lifecycle tracking','Moodboards with visual reference pinboards'] },
]

const TIERS = [
  { name:'Free', color:S.white, price:'$0', period:'forever', badge:null,
    desc:'For a single production.',
    features:['1 active project','3 collaborators','500 MB storage','Call sheet + shot list PDF','Script editor','30-day changelog'] },
  { name:'Pro', color:S.blue, price:'$24', period:'/month', badge:'Recommended',
    desc:'For working professionals.',
    features:['Unlimited projects','15 collaborators','10 GB storage','All export formats','Slate generator + PNG overlay','Full changelog history'] },
  { name:'Team', color:S.cyan, price:'$69', period:'/month', badge:null,
    desc:'For production companies.',
    features:['Everything in Pro','Unlimited collaborators','50 GB storage','Granular permissions per module','Priority support','SSO (coming soon)'] },
]

const SHOTS_PREVIEW = [
  { id:'1A-01', fs:'WS',  mv:'Static',   desc:'Establishing. María alone at the rooftop edge, back to camera.',  status:'filmed',      statusC:S.green,   eq:'35mm' },
  { id:'1A-03', fs:'MCU', mv:'Handheld', desc:'Carlos approaches. Two-shot resolving into OTS over María.',       status:'in progress', statusC:S.yellow,  eq:'50mm' },
  { id:'1B-01', fs:'ECU', mv:'Static',   desc:'Insert shot — phone screen glowing with unread notification.',      status:'not filmed',  statusC:S.blue,    eq:'100mm' },
]

const SmpteBar = ({ h=4 }) => (
  <div style={{ display:'flex', height:h, width:'100%', flexShrink:0 }}>
    {BAR.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
  </div>
)

const SmpteRule = () => (
  <div style={{ display:'flex', height:1, width:'100%', opacity:0.1 }}>
    {BAR.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
  </div>
)

const Logo = ({ size=40 }) => (
  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
    <div style={{ display:'flex', flexDirection:'column', gap:3, paddingRight:14, borderRight:'1px solid #222', flexShrink:0 }}>
      {BAR.map((c,i) => <div key={i} style={{ width:Math.max(5,size*0.1), height:Math.max(5,size*0.1), borderRadius:'50%', background:c, opacity:0.85 }} />)}
    </div>
    <div>
      <div style={{ marginRight:'-0.28em' }}>
        <span style={{ fontFamily:T.d, fontWeight:700, fontSize:size, letterSpacing:'0.28em', color:'#F0F0F0', lineHeight:1, display:'block' }}>FRAME</span>
      </div>
      <div style={{ fontFamily:T.d, fontWeight:400, fontSize:Math.max(9, size*0.22), letterSpacing:'0.26em', color:'#383838', textTransform:'uppercase', marginTop:size*0.1 }}>
        Production Management
      </div>
    </div>
  </div>
)

const Tag = ({ label, color }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:3,
    background:color+'18', border:`1px solid ${color}35`,
    fontFamily:T.m, fontSize:10, color:color, letterSpacing:'0.1em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
    <span style={{ width:4, height:4, borderRadius:'50%', background:color, flexShrink:0 }} />
    {label}
  </span>
)

const SectionLabel = ({ label, color=S.cyan }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
    <div style={{ width:3, height:13, background:color, borderRadius:1 }} />
    <span style={{ fontFamily:T.m, fontSize:10, color:'#666', letterSpacing:'0.16em', textTransform:'uppercase' }}>{label}</span>
  </div>
)

export default function FrameSummary() {
  const [hovMod, setHovMod] = useState(null)
  const [hovTier, setHovTier] = useState(null)

  return (
    <div style={{ background:'#090909', color:'#F0F0F0', fontFamily:T.b, overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <SmpteBar h={5} />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ padding:'88px 72px 80px', borderBottom:'1px solid #141414' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>

          <div style={{ animation:'fadeUp 0.7s ease forwards' }}>
            <Logo size={64} />
          </div>

          <div style={{ animation:'fadeUp 0.7s ease 0.12s forwards', opacity:0, marginTop:48 }}>
            <h1 style={{ fontFamily:T.d, fontWeight:700, fontSize:48, color:'#EBEBEB', letterSpacing:'-0.01em', lineHeight:1.1, marginBottom:20 }}>
              From concept<br/>to final cut.
            </h1>
            <p style={{ fontFamily:T.b, fontSize:17, color:'#AAA', maxWidth:520, lineHeight:1.75, marginBottom:32 }}>
              FRAME is a production management web app built for filmmakers who demand precision at every stage — pre-production, shoot day, and post.
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Tag label="Web Application" color={S.blue} />
              <Tag label="Pre-Production" color={S.yellow} />
              <Tag label="Shoot Day" color={S.green} />
              <Tag label="Post-Production" color={S.cyan} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ animation:'fadeUp 0.7s ease 0.24s forwards', opacity:0, marginTop:56,
            display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'#141414', borderRadius:6, overflow:'hidden' }}>
            {[['12','Modules'],['35+','Data types'],['3','Plan tiers'],['∞','Shot complexity']].map(([n,l]) => (
              <div key={l} style={{ background:'#0D0D0D', padding:'22px 24px' }}>
                <div style={{ fontFamily:T.d, fontWeight:700, fontSize:34, color:'#E8E8E8', letterSpacing:'0.02em', lineHeight:1, marginBottom:8 }}>{n}</div>
                <div style={{ fontFamily:T.m, fontSize:10, color:'#555', letterSpacing:'0.12em', textTransform:'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Mini UI Preview */}
          <div style={{ animation:'fadeUp 0.7s ease 0.36s forwards', opacity:0, marginTop:40 }}>
            <div style={{ background:'#0D0D0D', border:'1px solid #1C1C1C', borderRadius:6, overflow:'hidden' }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid #141414', display:'flex', alignItems:'center', gap:16 }}>
                <Logo size={14} />
                <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                  {['Shot List','Script','Schedule','People'].map((t,i) => (
                    <span key={t} style={{ fontFamily:T.d, fontWeight:600, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
                      color: i===0 ? '#DDD' : '#2E2E2E',
                      borderBottom: i===0 ? `1.5px solid ${S.cyan}` : '1.5px solid transparent',
                      padding:'4px 10px' }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'64px 40px 80px 1fr 80px 90px', gap:10,
                padding:'8px 16px', borderBottom:'1px solid #0E0E0E' }}>
                {['Shot #','FS','Movement','Description','Lens','Status'].map(h => (
                  <div key={h} style={{ fontFamily:T.m, fontSize:8, color:'#333', letterSpacing:'0.1em', textTransform:'uppercase' }}>{h}</div>
                ))}
              </div>
              {SHOTS_PREVIEW.map((row, i) => (
                <div key={row.id} style={{ display:'grid', gridTemplateColumns:'64px 40px 80px 1fr 80px 90px', gap:10,
                  padding:'10px 16px', borderBottom: i<2 ? '1px solid #0E0E0E':'none', alignItems:'center' }}>
                  <span style={{ fontFamily:T.m, fontSize:11, color:'#AAA', letterSpacing:'0.03em' }}>{row.id}</span>
                  <span style={{ fontFamily:T.m, fontSize:10, color:S.cyan, background:S.cyan+'12', border:`1px solid ${S.cyan}28`, padding:'1px 6px', borderRadius:2 }}>{row.fs}</span>
                  <span style={{ fontFamily:T.b, fontSize:11, color:'#666' }}>{row.mv}</span>
                  <span style={{ fontFamily:T.b, fontSize:12, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.desc}</span>
                  <span style={{ fontFamily:T.m, fontSize:10, color:'#444' }}>{row.eq}</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4,
                    fontFamily:T.d, fontWeight:600, fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase',
                    color:row.statusC, background:row.statusC+'14', border:`1px solid ${row.statusC}30`, padding:'2px 8px', borderRadius:2 }}>
                    <span style={{ width:4, height:4, borderRadius:'50%', background:row.statusC }} />{row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────── */}
      <section style={{ padding:'80px 72px', borderBottom:'1px solid #141414' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <SectionLabel label="The Problem" color={S.red} />
          <h2 style={{ fontFamily:T.d, fontWeight:700, fontSize:36, color:'#E8E8E8', letterSpacing:'-0.01em', marginBottom:12, lineHeight:1.15 }}>
            Productions shouldn't live<br/>in spreadsheets.
          </h2>
          <p style={{ fontFamily:T.b, fontSize:16, color:'#888', marginBottom:48, lineHeight:1.7, maxWidth:560 }}>
            Most productions patch together five different tools and call it a workflow. FRAME is the one place where everything is already connected.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {PROBLEMS.map(p => {
              const Icon = p.icon
              return (
                <div key={p.title} style={{ background:'#0D0D0D', border:'1px solid #1C1C1C', borderRadius:6, padding:'24px 22px',
                  borderTop:`2px solid ${p.color}40` }}>
                  <div style={{ width:36, height:36, borderRadius:4, background:p.color+'16', border:`1px solid ${p.color}28`,
                    display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                    <Icon size={16} color={p.color} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontFamily:T.d, fontWeight:600, fontSize:14, color:'#CCC', letterSpacing:'0.01em', marginBottom:10, lineHeight:1.3 }}>
                    {p.title}
                  </div>
                  <p style={{ fontFamily:T.b, fontSize:13, color:'#777', lineHeight:1.65, margin:0 }}>
                    {p.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── MODULES ──────────────────────────────────────────── */}
      <section style={{ padding:'80px 72px', borderBottom:'1px solid #141414' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <SectionLabel label="What's Included" color={S.blue} />
          <h2 style={{ fontFamily:T.d, fontWeight:700, fontSize:36, color:'#E8E8E8', letterSpacing:'-0.01em', marginBottom:12, lineHeight:1.15 }}>
            Every module your<br/>production needs.
          </h2>
          <p style={{ fontFamily:T.b, fontSize:16, color:'#888', marginBottom:48, lineHeight:1.7, maxWidth:520 }}>
            12 fully integrated modules. Every entity is relational — a change in one place reflects everywhere it matters.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'#141414', borderRadius:6, overflow:'hidden' }}>
            {MODULES.map((mod,i) => {
              const Icon = mod.icon
              const isHov = hovMod === i
              return (
                <div key={mod.name} onMouseEnter={() => setHovMod(i)} onMouseLeave={() => setHovMod(null)}
                  style={{ background: isHov ? '#0F0F0F':'#0A0A0A', padding:'22px 20px',
                    borderLeft: isHov ? `2px solid ${mod.color}` : '2px solid transparent',
                    transition:'all 0.12s', cursor:'default' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ width:32, height:32, borderRadius:4, background:mod.color+'18', border:`1px solid ${mod.color}30`,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={14} color={mod.color} strokeWidth={1.5} />
                    </div>
                    <span style={{ fontFamily:T.d, fontWeight:600, fontSize:13, color: isHov ? '#EEE':'#AAA', letterSpacing:'0.04em' }}>
                      {mod.name}
                    </span>
                  </div>
                  <p style={{ fontFamily:T.b, fontSize:13, color:'#666', lineHeight:1.6, margin:0 }}>
                    {mod.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FOR YOUR TEAM ──────────────────────────────────── */}
      <section style={{ padding:'80px 72px', borderBottom:'1px solid #141414' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <SectionLabel label="For Every Role" color={S.yellow} />
          <h2 style={{ fontFamily:T.d, fontWeight:700, fontSize:36, color:'#E8E8E8', letterSpacing:'-0.01em', marginBottom:12, lineHeight:1.15 }}>
            Built for everyone<br/>on the production.
          </h2>
          <p style={{ fontFamily:T.b, fontSize:16, color:'#888', marginBottom:48, lineHeight:1.7, maxWidth:520 }}>
            Each team member sees what they need. The director sees the full picture. The AD builds the schedule. The DP works the shotlist. Everyone stays aligned.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {ROLES.map(r => (
              <div key={r.role} style={{ background:'#0D0D0D', border:'1px solid #1C1C1C', borderRadius:6, padding:'22px 22px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:r.color }} />
                  <span style={{ fontFamily:T.d, fontWeight:600, fontSize:13, color:'#CCCCCC', letterSpacing:'0.04em' }}>{r.role}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {r.gets.map(g => (
                    <div key={g} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <ChevronRight size={12} color={r.color} strokeWidth={2} style={{ flexShrink:0, marginTop:3 }} />
                      <span style={{ fontFamily:T.b, fontSize:13, color:'#777', lineHeight:1.5 }}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIERS ────────────────────────────────────────────── */}
      <section style={{ padding:'80px 72px', borderBottom:'1px solid #141414' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <SectionLabel label="Pricing" color={S.green} />
          <h2 style={{ fontFamily:T.d, fontWeight:700, fontSize:36, color:'#E8E8E8', letterSpacing:'-0.01em', marginBottom:12, lineHeight:1.15 }}>
            Every production size,<br/>covered.
          </h2>
          <p style={{ fontFamily:T.b, fontSize:16, color:'#888', marginBottom:48, lineHeight:1.7, maxWidth:520 }}>
            Start free for a single project. Upgrade when your production volume demands it — not before.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {TIERS.map(tier => {
              const isHov = hovTier === tier.name
              return (
                <div key={tier.name} onMouseEnter={() => setHovTier(tier.name)} onMouseLeave={() => setHovTier(null)}
                  style={{ position:'relative', background: tier.name==='Pro' ? '#08111E':'#0D0D0D',
                    border: tier.name==='Pro' ? `1px solid ${tier.color}55` : `1px solid ${isHov ? '#262626':'#1C1C1C'}`,
                    borderRadius:6, padding:'28px 24px', transition:'all 0.12s' }}>
                  {tier.badge && (
                    <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)',
                      background:tier.color, color:'#090909', fontFamily:T.m, fontSize:9, fontWeight:500,
                      letterSpacing:'0.1em', padding:'3px 14px', borderRadius:2, whiteSpace:'nowrap' }}>
                      {tier.badge}
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:tier.color }} />
                    <span style={{ fontFamily:T.d, fontWeight:700, fontSize:13, color:tier.color, letterSpacing:'0.12em', textTransform:'uppercase' }}>{tier.name}</span>
                  </div>

                  <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}>
                    <span style={{ fontFamily:T.d, fontWeight:700, fontSize:38, color:'#E0E0E0', letterSpacing:'0.01em', lineHeight:1 }}>{tier.price}</span>
                    <span style={{ fontFamily:T.m, fontSize:11, color:'#555' }}>{tier.period}</span>
                  </div>
                  <div style={{ fontFamily:T.b, fontSize:13, color:'#666', marginBottom:20 }}>{tier.desc}</div>

                  <div style={{ height:1, background:'#161616', marginBottom:20 }} />

                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {tier.features.map(f => (
                      <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
                        <Check size={12} color={tier.color} strokeWidth={2.5} style={{ flexShrink:0, marginTop:2 }} />
                        <span style={{ fontFamily:T.b, fontSize:13, color:'#777', lineHeight:1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── DESIGN LANGUAGE ─────────────────────────────────── */}
      <section style={{ padding:'80px 72px' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <SectionLabel label="Design Language" color={S.magenta} />
          <h2 style={{ fontFamily:T.d, fontWeight:700, fontSize:36, color:'#E8E8E8', letterSpacing:'-0.01em', marginBottom:12, lineHeight:1.15 }}>
            SMPTE color bars,<br/>reinterpreted.
          </h2>
          <p style={{ fontFamily:T.b, fontSize:16, color:'#888', marginBottom:40, lineHeight:1.7, maxWidth:520 }}>
            The seven SMPTE broadcast colors become a semantic system. Every color means something. Nothing is decorative.
          </p>

          <div style={{ display:'flex', gap:0, height:10, borderRadius:3, overflow:'hidden', marginBottom:32 }}>
            {BAR.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
            {[
              [S.white,  'Approved',   'Confirmed'],
              [S.yellow, 'In Progress','On Set'],
              [S.cyan,   'Camera',     'Photography'],
              [S.green,  'Filmed',     'Done'],
              [S.magenta,'Styling',    'Art Dept'],
              [S.red,    'Blocked',    'Urgent'],
              [S.blue,   'Production', 'Scheduled'],
            ].map(([c,l1,l2]) => (
              <div key={l1} style={{ background:c+'12', border:`1px solid ${c}25`, borderRadius:4, padding:'12px 10px', textAlign:'center' }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:c, margin:'0 auto 10px' }} />
                <div style={{ fontFamily:T.m, fontSize:9, color:c, letterSpacing:'0.06em', lineHeight:1.6 }}>{l1}<br/>{l2}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:32, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            <div style={{ background:'#0D0D0D', border:'1px solid #1C1C1C', borderRadius:6, padding:'22px 22px' }}>
              <div style={{ fontFamily:T.m, fontSize:10, color:'#555', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:16 }}>Type System</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ paddingBottom:14, borderBottom:'1px solid #141414' }}>
                  <div style={{ fontFamily:T.d, fontWeight:700, fontSize:28, letterSpacing:'0.28em', color:'#F0F0F0', lineHeight:1, marginRight:'-0.28em' }}>FRAME</div>
                  <div style={{ fontFamily:T.m, fontSize:9, color:'#444', marginTop:4 }}>Syne 700 · 0.28em — Wordmark</div>
                </div>
                <div style={{ paddingBottom:14, borderBottom:'1px solid #141414' }}>
                  <div style={{ fontFamily:T.m, fontSize:12, color:'#AAA', letterSpacing:'0.04em' }}>1A-03 · MCU · 50mm · 08:30</div>
                  <div style={{ fontFamily:T.m, fontSize:9, color:'#444', marginTop:4 }}>DM Mono — Shot data, timecodes, lenses</div>
                </div>
                <div>
                  <div style={{ fontFamily:T.b, fontSize:14, color:'#999', lineHeight:1.6 }}>Carlos approaches from behind.</div>
                  <div style={{ fontFamily:T.m, fontSize:9, color:'#444', marginTop:4 }}>DM Sans — Descriptions, body copy</div>
                </div>
              </div>
            </div>

            <div style={{ background:'#0D0D0D', border:'1px solid #1C1C1C', borderRadius:6, padding:'22px 22px' }}>
              <div style={{ fontFamily:T.m, fontSize:10, color:'#555', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:16 }}>Surface Scale</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                {[['#090909','bg-base','Page background'],['#131313','bg-surface','Cards, panels'],['#1C1C1C','bg-elevated','Dropdowns, modals'],['#252525','bg-overlay','Tooltips, popovers']].map(([hex,name,use]) => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:3, background:hex, border:'1px solid #1E1E1E', flexShrink:0 }} />
                    <div>
                      <div style={{ fontFamily:T.m, fontSize:9, color:'#666' }}>{name}</div>
                      <div style={{ fontFamily:T.b, fontSize:11, color:'#444' }}>{use}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily:T.m, fontSize:9, color:'#333', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Base</div>
              <div style={{ fontFamily:T.b, fontSize:12, color:'#555' }}>Near-black, not pure black. The set is dark — but detail matters.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <div style={{ borderTop:'1px solid #111', padding:'24px 72px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Logo size={20} />
        <div style={{ display:'flex', gap:20, alignItems:'center' }}>
          <span style={{ fontFamily:T.m, fontSize:9, color:'#2E2E2E', letterSpacing:'0.1em' }}>© 2025 FRAME</span>
          <span style={{ fontFamily:T.m, fontSize:9, color:'#2E2E2E', letterSpacing:'0.1em' }}>frameapp.co</span>
        </div>
      </div>
      <SmpteBar h={4} />
    </div>
  )
}
