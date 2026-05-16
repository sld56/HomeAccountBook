// 인라인 SVG 아이콘 (1.5px stroke, currentColor)
// 부모님 가독성을 위해 24~28px로 사용

const Icon = ({ d, size = 22, fill = false, viewBox = "0 0 24 24", style }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill ? "currentColor" : "none"}
       stroke={fill ? "none" : "currentColor"} strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" style={style}>
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);

const Icons = {
  home: (p) => <Icon {...p} d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>,
  list: (p) => <Icon {...p} d={<><path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>}/>,
  chart:(p) => <Icon {...p} d={<><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></>}/>,
  wallet:(p)=> <Icon {...p} d={<><path d="M3 7c0-1.1.9-2 2-2h13a1 1 0 0 1 1 1v3"/><path d="M21 9H6a3 3 0 0 0 0 6h15a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1z"/><circle cx="17" cy="12" r="1.2" fill="currentColor"/><path d="M19 15v3a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/></>}/>,
  goal: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>}/>,
  bell: (p) => <Icon {...p} d={<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></>}/>,
  settings:(p)=><Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>}/>,
  plus: (p) => <Icon {...p} d={<><path d="M12 5v14"/><path d="M5 12h14"/></>}/>,
  arrowUp: (p) => <Icon {...p} d={<><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></>}/>,
  arrowDown:(p)=> <Icon {...p} d={<><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>}/>,
  arrowRight:(p)=><Icon {...p} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>}/>,
  cal:  (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>}/>,
  filter:(p) => <Icon {...p} d="M4 5h16l-6 8v6l-4-2v-4z"/>,
  search:(p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}/>,
  check:(p)  => <Icon {...p} d="m5 13 4 4L19 7"/>,
  close:(p)  => <Icon {...p} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>}/>,
  people:(p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M22 18a4.5 4.5 0 0 0-6-4.2"/></>}/>,
  card:(p)   => <Icon {...p} d={<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></>}/>,
  cash:(p)   => <Icon {...p} d={<><rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></>}/>,
  bank:(p)   => <Icon {...p} d={<><path d="M3 10 12 4l9 6"/><path d="M5 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/><path d="M19 10v8"/><path d="M3 21h18"/></>}/>,
  pencil:(p) => <Icon {...p} d={<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/></>}/>,
  more: (p)  => <Icon {...p} d={<><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></>}/>,
  trash:(p)  => <Icon {...p} d={<><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></>}/>,
  trending:(p)=> <Icon {...p} d={<><path d="m3 17 7-7 4 4 7-7"/><path d="M14 7h7v7"/></>}/>,
  piggy:(p) => <Icon {...p} d={<><path d="M19 9c1 .5 2 1.5 2 3s-1 2.5-2 3v2h-3l-1 2h-3l-1-2H8a6 6 0 0 1-6-6c0-3.5 3-6 7-6 2 0 4 .7 5.5 2H17a3 3 0 0 1 2 2z"/><circle cx="17" cy="11" r=".7" fill="currentColor"/></>}/>,
  receipt:(p)=> <Icon {...p} d={<><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></>}/>,
  voice:(p) => <Icon {...p} d={<><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>}/>,
  fire:(p) => <Icon {...p} d="M12 2c0 4-5 5-5 10a5 5 0 0 0 10 0c0-2-1-3-2-4 0 2-1 3-2 3 0-3 1-5-1-9z"/>,
};

window.Icon = Icon;
window.Icons = Icons;
