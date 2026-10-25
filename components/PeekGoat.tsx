export default function PeekGoat() {
  return (
    <aside className="peek-goat" aria-label="Mascota Goats">
      <div className="peek-goat-window" aria-hidden="true">
        <div className="peek-goat-character">
          <span className="peek-goat-bubble">¡Beeenvenido!</span>
          <svg viewBox="0 0 180 210" className="peek-goat-drawing">
            <path d="M46 189Q45 138 92 138Q140 138 141 189L147 210H39Z" fill="#9164ed" stroke="#39244e" strokeWidth="5" />
            <path d="M66 151L93 180L120 151" fill="none" stroke="#dac9ff" strokeWidth="5" />
            <path d="M47 71Q22 45 10 65Q9 86 47 91M134 71Q161 45 174 65Q175 86 137 91" fill="#fff4fa" stroke="#39244e" strokeWidth="5" />
            <path d="M22 66L45 80M161 66L138 80" stroke="#eeadca" strokeWidth="7" strokeLinecap="round" />
            <path d="M52 64Q36 40 50 12Q53 37 72 48M111 48Q132 37 133 12Q150 40 133 64" fill="#c0a1f4" stroke="#39244e" strokeWidth="5" strokeLinejoin="round" />
            <path d="M43 83Q41 43 92 43Q143 43 140 83L137 117Q131 151 92 159Q52 151 46 117Z" fill="#fff8fc" stroke="#39244e" strokeWidth="5" />
            <path d="M50 72L59 44L76 51L91 37L109 53L127 44L137 75L119 65L107 77L91 62L76 77L64 65Z" fill="#39244e" strokeLinejoin="round" />
            <g className="peek-goat-eyes">
              <ellipse cx="70" cy="101" rx="9" ry="14" fill="#58357e" /><ellipse cx="113" cy="101" rx="9" ry="14" fill="#58357e" />
              <circle cx="73" cy="96" r="4" fill="white" /><circle cx="116" cy="96" r="4" fill="white" />
            </g>
            <ellipse cx="56" cy="119" rx="10" ry="5" fill="#efa5c5" /><ellipse cx="126" cy="119" rx="10" ry="5" fill="#efa5c5" />
            <path d="M85 119Q92 125 99 119M80 132Q92 144 105 131" fill="none" stroke="#62344f" strokeWidth="3" strokeLinecap="round" />
            <path d="M89 149L93 163L97 149" fill="#fff8fc" stroke="#39244e" strokeWidth="3" />
            <g className="peek-goat-wave">
              <path d="M126 179Q145 176 151 144Q155 133 161 140Q176 156 158 186L147 196" fill="#fff8fc" stroke="#39244e" strokeWidth="5" strokeLinecap="round" />
              <path d="M151 135L151 126M162 135L167 128" stroke="#9164ed" strokeWidth="3" strokeLinecap="round" />
            </g>
            <text x="90" y="201" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontSize="15" fontWeight="800">GOATS</text>
          </svg>
        </div>
      </div>
    </aside>
  );
}
