const COLOUR_MAP = {
  BLACK: '#1a1a1a',
  WHITE: '#f0f0f0',
  BRASS: '#b5913a',
  COPPER: '#b87333',
  DARK_GREY: '#555',
  TITANIUM: '#7a7a7a',
  GOLD: '#d4af37',
  MATT_SILVER: '#b0b0b0',
  CHROME: '#c8d0d8',
};

const CCT_MAP = {
  '2700K': '#ff9a3c',
  '3000K': '#ffb347',
  '3500K': '#ffd280',
  '4000K': '#fffde7',
  '6000K': '#e3f2fd',
  TUNABLE: 'linear-gradient(90deg, #ff9a3c, #e3f2fd)',
};

const BEAM_MAP = {
  '05DEG': '#6c63ff',
  '10DEG': '#7b74ff',
  '15DEG': '#8a84ff',
  '24DEG': '#9c94ff',
  '36DEG': '#ae9eff',
  '38DEG': '#b9a8ff',
  '40DEG': '#c4b2ff',
  '55DEG': '#d0bcff',
  '60DEG': '#dcc6ff',
  '90DEG': '#e8d1ff',
  '110DEG': '#f3dbff',
  '120DEG': '#fde4ff',
};

const CRI_MAP = {
  '>70': '#f59e0b',
  '>80': '#10b981',
  '>90': '#06b6d4',
};

function formatLabel(v) {
  return v
    .replace('DEG', '°')
    .replace(/_/g, ' ')
    .replace('TUNABLE', '🌡︎ Tunable');
}

function Pill({ value, bg, textColor = '#fff', small = false }) {
  return (
    <span
      title={value}
      style={{
        display: 'inline-block',
        padding: small ? '1px 5px' : '2px 7px',
        borderRadius: 4,
        fontSize: small ? 9 : 10,
        fontWeight: 600,
        margin: '1px 2px',
        background: bg || '#1E2D47',
        color: textColor,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
      }}
    >
      {formatLabel(value)}
    </span>
  );
}

export default function AttributeTagPills({ bodyColours = [], reflectorColours = [], colourTemps = [], beamAngles = [], cri = [], small = false }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
      {bodyColours.map((v, i) => (
        <Pill key={`b-${v}-${i}`} value={v} bg={COLOUR_MAP[v] || '#1E2D47'} textColor={v === 'WHITE' ? '#111' : '#fff'} small={small} />
      ))}
      {colourTemps.map((v, i) => (
        <Pill key={`c-${v}-${i}`} value={v} bg={CCT_MAP[v] || '#F5A623'} textColor={v === '4000K' || v === '3500K' || v === '6000K' ? '#222' : '#222'} small={small} />
      ))}
      {beamAngles.map((v, i) => (
        <Pill key={`a-${v}-${i}`} value={v} bg={BEAM_MAP[v] || '#6c63ff'} textColor="#fff" small={small} />
      ))}
      {cri.map((v, i) => (
        <Pill key={`r-${v}-${i}`} value={v} bg={CRI_MAP[v] || '#10b981'} textColor="#fff" small={small} />
      ))}
    </div>
  );
}
