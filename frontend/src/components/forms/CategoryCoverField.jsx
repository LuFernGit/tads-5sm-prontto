import Icon from "@/components/ui/Icon"
import { resizeImage } from "@/lib/imageCrop"
import "./CategoryCoverField.css"

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Campo "Foto de capa" de uma categoria (cadastro da empresa e Serviços >
 * Gerenciar categorias). A capa aparece nos cartões da vitrine e é
 * OBRIGATÓRIA: a tela que usa o campo valida antes de salvar.
 *
 *  - value    = foto escolhida (data URL) ou "" (ainda sem foto)
 *  - fallback = capa atual mostrada enquanto não há foto nova (opcional;
 *               usada só para categorias antigas, criadas sem foto)
 *  - onChange(dataUrl) recebe a foto já reduzida (até 1600 px, JPEG)
 *  - onError(mensagem) mostra o erro embaixo do campo (useFieldErrors)
 *  - inputProps = a11y(id) do useFieldErrors (id, aria-invalid, aria-describedby)
 *
 * Acessibilidade: o quadro é um <label> do <input type="file">, então abre o
 * seletor com clique, Enter ou Espaço.
 */
function CategoryCoverField({
  inputProps,
  value,
  fallback,
  onChange,
  onError,
  label = "FOTO DE CAPA *",
  error = null,
}) {
  const id = inputProps.id
  const preview = value || fallback

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    // Limpa o input para permitir escolher o mesmo arquivo de novo.
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      onError("Esse arquivo não é uma imagem. Escolha uma foto JPG, PNG ou WEBP.")
      return
    }
    if (file.size > MAX_BYTES) {
      onError("A imagem tem mais de 5 MB. Escolha uma foto menor ou reduza o tamanho dela.")
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      // readAsDataURL sempre devolve texto (data URL).
      const original = typeof reader.result === "string" ? reader.result : ""
      if (!original) {
        onError("Não foi possível ler essa imagem. Tente outra foto.")
        return
      }
      try {
        onChange(await resizeImage(original))
      } catch {
        // Se o navegador não conseguir reduzir, usa a foto como veio.
        onChange(original)
      }
    }
    reader.onerror = () =>
      onError("Não foi possível ler essa imagem. Tente outra foto.")
    reader.readAsDataURL(file)
  }

  return (
    <div className="cover-field">
      <label htmlFor={id} className="cover-field-label">
        <span>{label}</span>
        <input
          {...inputProps}
          type="file"
          accept="image/*"
          onChange={handleFile}
        />
        <div className={`cover-field-box ${value ? "has-photo" : ""}`}>
          {preview ? (
            <img src={preview} alt="" />
          ) : (
            <Icon name="plus" />
          )}
          <span className="cover-field-cta">
            <Icon name={value ? "edit" : "plus"} size={14} />
            {value ? "Trocar foto" : "Escolher foto"}
          </span>
          {!value && preview && (
            <small className="cover-field-badge">Sem foto própria</small>
          )}
        </div>
      </label>
      <small className="cover-field-hint">JPG, PNG ou WEBP · até 5 MB</small>
      {error}
    </div>
  )
}

export default CategoryCoverField
