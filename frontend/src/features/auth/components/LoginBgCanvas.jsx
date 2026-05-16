const LoginBgCanvas = ({ t }) => {
  return (
    <svg
      className="login-bg-canvas"
      viewBox="0 0 560 660"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="arrowW"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.28)" />
        </marker>

        <marker
          id="arrowG"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(110,231,183,0.7)" />
        </marker>

        <radialGradient id="vig" cx="50%" cy="60%" r="52%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#03045e" stopOpacity="0.75" />
        </radialGradient>
      </defs>

      <g stroke="rgba(255,255,255,0.042)" strokeWidth="1">
        {[80, 160, 240, 320, 400].map((y) => (
          <line key={y} x1="0" y1={y} x2="560" y2={y} />
        ))}

        {[140, 280, 420].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="660" />
        ))}
      </g>

      <polyline
        points="30,240 80,210 130,222 180,185 230,165 285,142 340,125 395,104 450,82 505,60"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <polygon
        points="30,240 80,210 130,222 180,185 230,165 285,142 340,125 395,104 450,82 505,60 505,260 30,260"
        fill="rgba(255,255,255,0.03)"
      />

      <line
        x1="370"
        y1="120"
        x2="445"
        y2="78"
        stroke="rgba(110,231,183,0.65)"
        strokeWidth="1.5"
        markerEnd="url(#arrowG)"
      />

      {[
        { x: 330, h: 52 },
        { x: 350, h: 70 },
        { x: 370, h: 58 },
        { x: 390, h: 90 },
        { x: 410, h: 74 },
        { x: 430, h: 108 },
      ].map(({ x, h }, index) => (
        <rect
          key={index}
          x={x}
          y={250 - h}
          width="14"
          height={h}
          rx="3"
          fill={
            index === 5
              ? "rgba(255,255,255,0.32)"
              : "rgba(255,255,255,0.14)"
          }
          opacity="0.55"
        />
      ))}

      <text
        x="382"
        y="242"
        fill="rgba(255,255,255,0.22)"
        fontSize="8"
        fontFamily="Inter,sans-serif"
        fontWeight="600"
        textAnchor="middle"
        letterSpacing=".08em"
      >
        {t("login.visual.conversions")}
      </text>

      <line
        x1="42"
        y1="340"
        x2="42"
        y2="288"
        stroke="rgba(110,231,183,0.55)"
        strokeWidth="1.5"
        markerEnd="url(#arrowG)"
      />

      <text
        x="56"
        y="306"
        fill="rgba(110,231,183,0.6)"
        fontSize="10"
        fontFamily="Inter,sans-serif"
        fontWeight="700"
      >
        +18.4%
      </text>

      <text
        x="56"
        y="319"
        fill="rgba(255,255,255,0.22)"
        fontSize="9"
        fontFamily="Inter,sans-serif"
      >
        {t("login.visual.campaignRoi")}
      </text>

      {[
        [85, 355],
        [112, 336],
        [144, 344],
        [172, 322],
        [200, 310],
        [228, 296],
        [256, 302],
      ].map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index % 3 === 1 ? 4 : 3}
          fill="rgba(255,255,255,0.2)"
        />
      ))}

      <line
        x1="82"
        y1="358"
        x2="260"
        y2="298"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />

      <polyline
        points="55,400 92,432 138,396 192,368"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        markerEnd="url(#arrowG)"
      />

      <circle
        cx="490"
        cy="155"
        r="40"
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="13"
      />

      <circle
        cx="490"
        cy="155"
        r="40"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="13"
        strokeDasharray="158 93"
        strokeDashoffset="0"
        strokeLinecap="round"
      />

      <circle
        cx="490"
        cy="155"
        r="40"
        fill="none"
        stroke="rgba(110,231,183,0.38)"
        strokeWidth="13"
        strokeDasharray="62 189"
        strokeDashoffset="-158"
        strokeLinecap="round"
      />

      <text
        x="490"
        y="150"
        fill="rgba(255,255,255,0.72)"
        fontSize="12"
        fontFamily="Inter,sans-serif"
        fontWeight="800"
        textAnchor="middle"
      >
        84%
      </text>

      <text
        x="490"
        y="163"
        fill="rgba(255,255,255,0.28)"
        fontSize="8"
        fontFamily="Inter,sans-serif"
        textAnchor="middle"
        letterSpacing=".06em"
      >
        {t("login.visual.forecast")}
      </text>

      <line
        x1="30"
        y1="460"
        x2="190"
        y2="368"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="2"
        markerEnd="url(#arrowW)"
      />

      {[65, 98, 132].map((r, index) => (
        <circle
          key={index}
          cx="500"
          cy="550"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.045)"
          strokeWidth="1"
          opacity={1 - index * 0.2}
        />
      ))}

      <rect width="560" height="660" fill="url(#vig)" />
    </svg>
  );
};

export default LoginBgCanvas;