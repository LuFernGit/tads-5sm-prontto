import "./Detail.css"

/**
 * Campo complementar para detalhar uma resposta da ficha de anamnese.
 */
function Detail({
  id,
  label,
  value,
  onChange,
  error,
  placeholder = "Descreva aqui...",
}) {
  return (
    <div className="ff-field ff-detail">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && (
        <small className="ff-error" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}

export default Detail
