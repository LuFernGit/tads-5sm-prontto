/**
 * Campo reutilizável para perguntas binárias da ficha de anamnese.
 */
function YesNo({ id, label, value, onChange, error }) {
  return (
    <fieldset className="ff-question">
      <legend>{label}</legend>
      <div className="ff-radio-row">
        {/* Dois botões de rádio com o mesmo name: só um pode ficar marcado. */}
        {["Não", "Sim"].map((option) => (
          <label key={option} className="ff-radio">
            <input
              type="radio"
              name={id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </div>
      {error && (
        <small className="ff-error" role="alert">
          {error}
        </small>
      )}
    </fieldset>
  )
}

export default YesNo
