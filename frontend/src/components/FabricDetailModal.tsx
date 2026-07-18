import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, Edit3, FileText, ImagePlus, PackageCheck, Paperclip, Save, ScrollText, Trash2, Truck, UserRound, X } from 'lucide-react'
import { api } from '../api/client'
import type { Development, FabricRequest, Label, Supplier } from '../types'
import { LabelPicker } from './LabelPicker'
import { QrFileUpload, type UploadedFile } from './QrFileUpload'

const STATUS_NAMES: Record<string, string> = {
  pedido: 'Pedido feito', envio_em_curso: 'Envio em curso', recebida: 'Rolo/metros recebido',
  tingimento: 'Em tingimento', cancelada: 'Cancelado',
}
const STOCK_NAMES: Record<string, string> = {
  unknown: 'Stock por confirmar', available: 'Stock disponível', unavailable: 'Sem stock',
  developing: 'Rolo a desenvolver', discontinued: 'Fora de coleção', partial: 'Stock parcial',
}
const STOCK_TONES: Record<string, string> = {
  available: 'mint', unavailable: 'pink', developing: 'peach', discontinued: 'pink', partial: 'yellow', unknown: 'lilac',
}
const CHANNELS = [['', 'Não indicado'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['telefone', 'Telefone'], ['reuniao', 'Reunião']] as const

type EditForm = {
  reference: string; article: string; composition: string; width: string; grammage: string; color: string
  quantity_meters: string; price_per_meter: string; leadtime: string; status: string; stock_status: string
  supplier_id: string; request_channel: string; requested_by: string; requested_to: string
  requested_at: string; supplier_confirmed_at: string; expected_at: string; received_at: string
  notes: string; treatment_notes: string
}

type Props = {
  item: FabricRequest
  statuses: string[]
  suppliers: Supplier[]
  labels: Label[]
  developments: Development[]
  supplierAverageDays?: number
  onClose: () => void
  onPatch: (payload: Record<string, unknown>, message?: string) => Promise<FabricRequest>
  onDelete: () => void
  onAddDevelopment: (developmentId: number, relationType: string) => Promise<void>
  onRemoveDevelopment: (linkId: number) => Promise<void>
}

function editFrom(item: FabricRequest): EditForm {
  return {
    reference: item.reference, article: item.article || '', composition: item.composition || '', width: item.width || '',
    grammage: item.grammage || '', color: item.color || '', quantity_meters: item.quantity_meters ? String(item.quantity_meters) : '',
    price_per_meter: item.price_per_meter ? String(item.price_per_meter) : '', leadtime: item.leadtime || '', status: item.status,
    stock_status: item.stock_status || 'unknown', supplier_id: item.supplier_id ? String(item.supplier_id) : '',
    request_channel: item.request_channel || '', requested_by: item.requested_by || '', requested_to: item.requested_to || '',
    requested_at: item.requested_at || '', supplier_confirmed_at: item.supplier_confirmed_at || '', expected_at: item.expected_at || '',
    received_at: item.received_at || '', notes: item.notes || '', treatment_notes: item.treatment_notes || '',
  }
}

function formatDate(value?: string) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-PT') : 'Por definir'
}

export function FabricDetailModal({ item, statuses, suppliers, labels, developments, supplierAverageDays, onClose, onPatch, onDelete, onAddDevelopment, onRemoveDevelopment }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm>(() => editFrom(item))
  const [newDevelopmentId, setNewDevelopmentId] = useState('')
  const [relationType, setRelationType] = useState('candidate')
  const [uploading, setUploading] = useState(false)
  const images = useMemo(() => [...new Set([
    ...(item.cover_url ? [item.cover_url] : []),
    ...item.attachments.filter(file => file.mime_type.startsWith('image')).map(file => file.url),
  ])], [item.cover_url, item.attachments])
  const [activeImage, setActiveImage] = useState(images[0] || '')

  useEffect(() => {
    setForm(editFrom(item))
    setActiveImage(current => images.includes(current) ? current : images[0] || '')
  }, [item, images])

  async function save() {
    await onPatch({
      ...form,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      quantity_meters: form.quantity_meters ? Number(form.quantity_meters) : null,
      price_per_meter: form.price_per_meter ? Number(form.price_per_meter) : null,
      requested_at: form.requested_at || null,
      supplier_confirmed_at: form.supplier_confirmed_at || null,
      expected_at: form.expected_at || null,
      received_at: form.received_at || null,
      request_channel: form.request_channel || null,
      requested_by: form.requested_by || null,
      requested_to: form.requested_to || null,
      treatment_notes: form.treatment_notes || null,
      notes: form.notes || null,
    }, 'Ficha de malha atualizada.')
    setEditing(false)
  }

  async function addAttachment(file: UploadedFile) {
    const attachments = [...item.attachments.filter(existing => existing.url !== file.url), file]
    await onPatch({ attachments, cover_url: item.cover_url || (file.mime_type.startsWith('image') ? file.url : null) }, 'Fotografia ou documento adicionado.')
    if (file.mime_type.startsWith('image')) setActiveImage(file.url)
  }

  async function upload(file?: File) {
    if (!file) return
    setUploading(true)
    try { await addAttachment(await api.upload(file)) } finally { setUploading(false) }
  }

  async function removeAttachment(url: string) {
    const attachments = item.attachments.filter(file => file.url !== url)
    const nextCover = item.cover_url === url ? attachments.find(file => file.mime_type.startsWith('image'))?.url || null : item.cover_url
    await onPatch({ attachments, cover_url: nextCover }, 'Anexo removido.')
  }

  const noteLines = (item.notes || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const totalValue = item.quantity_meters && item.price_per_meter ? item.quantity_meters * item.price_per_meter : null

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <article className="fabric-rich-modal" onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X/></button>
      <header className="fabric-rich-header">
        <div className="fabric-gallery">
          {activeImage ? <img className="fabric-main-image" src={activeImage} alt={`Malha ${item.reference}`}/> : <div className="fabric-image-empty"><ImagePlus/><span>Sem fotografia</span></div>}
          {images.length > 1 && <div className="fabric-image-strip">{images.map(url => <button type="button" key={url} className={url === activeImage ? 'active' : ''} onClick={() => setActiveImage(url)}><img src={url} alt=""/></button>)}</div>}
        </div>
        <div className="fabric-heading-copy">
          <div className="fabric-heading-chips">
            <span className={`chip tone-${STOCK_TONES[item.stock_status] || 'lilac'}`}>{STOCK_NAMES[item.stock_status] || item.stock_status}</span>
            <span className={`chip tone-${item.status === 'recebida' ? 'mint' : item.status === 'cancelada' ? 'pink' : 'sky'}`}>{STATUS_NAMES[item.status] || item.status}</span>
            {item.needs_reminder && <span className="chip tone-pink">Requer seguimento</span>}
          </div>
          <h2>{item.reference}{item.color ? ` · ${item.color}` : ''}</h2>
          <p>{[item.article, item.composition, item.grammage && `${item.grammage} g/m²`, item.width && `${item.width} m largura`].filter(Boolean).join(' · ') || 'Ficha técnica da etiqueta ainda por completar'}</p>
          <div className="fabric-summary-grid">
            <div><PackageCheck/><span>Quantidade<strong>{item.quantity_meters ? `${item.quantity_meters} m` : 'Por definir'}</strong></span></div>
            <div><CalendarDays/><span>Pedido em<strong>{formatDate(item.requested_at)}</strong></span></div>
            <div><UserRound/><span>Pedido a<strong>{item.requested_to || item.supplier_name || 'Por definir'}</strong></span></div>
            <div><Truck/><span>Demora<strong>{item.days_to_receive != null ? `${item.days_to_receive} dias neste pedido` : item.days_pending != null ? `${item.days_pending} dias à espera` : 'Sem medição'}</strong></span></div>
          </div>
          <div className="fabric-header-actions">
            <button type="button" className="secondary-button" onClick={() => setEditing(value => !value)}><Edit3 size={15}/>{editing ? 'Cancelar edição' : 'Editar ficha'}</button>
            {editing && <button type="button" className="primary-button" onClick={() => void save()}><Save size={15}/>Guardar</button>}
          </div>
        </div>
      </header>

      <div className="fabric-rich-body">
        <main>
          <section className="fabric-info-section">
            <div className="section-title"><Truck size={18}/><strong>Pedido e acompanhamento</strong></div>
            {editing ? <div className="fabric-edit-grid">
              <label>Referência<input value={form.reference} onChange={event => setForm({ ...form, reference: event.target.value })}/></label>
              <label>Fornecedor<select value={form.supplier_id} onChange={event => setForm({ ...form, supplier_id: event.target.value })}><option value="">Sem fornecedor</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
              <label>Estado do pedido<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{statuses.map(status => <option key={status} value={status}>{STATUS_NAMES[status] || status}</option>)}</select></label>
              <label>Disponibilidade<select value={form.stock_status} onChange={event => setForm({ ...form, stock_status: event.target.value })}>{Object.entries(STOCK_NAMES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Pedido por<input value={form.requested_by} onChange={event => setForm({ ...form, requested_by: event.target.value })} placeholder="Designer / responsável"/></label>
              <label>Pedido a<input value={form.requested_to} onChange={event => setForm({ ...form, requested_to: event.target.value })} placeholder="Contacto do fornecedor"/></label>
              <label>Canal<select value={form.request_channel} onChange={event => setForm({ ...form, request_channel: event.target.value })}>{CHANNELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Data do pedido<input type="date" value={form.requested_at} onChange={event => setForm({ ...form, requested_at: event.target.value })}/></label>
              <label>Confirmação fornecedor<input type="date" value={form.supplier_confirmed_at} onChange={event => setForm({ ...form, supplier_confirmed_at: event.target.value })}/></label>
              <label>Previsão de chegada<input type="date" value={form.expected_at} onChange={event => setForm({ ...form, expected_at: event.target.value })}/></label>
              <label>Recebido em<input type="date" value={form.received_at} onChange={event => setForm({ ...form, received_at: event.target.value })}/></label>
              <label>Leadtime indicado<input value={form.leadtime} onChange={event => setForm({ ...form, leadtime: event.target.value })} placeholder="Ex.: 4–5 semanas"/></label>
            </div> : <div className="fabric-definition-grid">
              <div><small>FORNECEDOR</small><strong>{item.supplier_name || 'Sem fornecedor'}</strong></div>
              <div><small>DISPONIBILIDADE</small><strong>{STOCK_NAMES[item.stock_status] || 'Por confirmar'}</strong></div>
              <div><small>PEDIDO POR</small><strong>{item.requested_by || 'Não indicado'}</strong></div>
              <div><small>PEDIDO A</small><strong>{item.requested_to || 'Não indicado'}</strong></div>
              <div><small>CANAL</small><strong>{CHANNELS.find(([value]) => value === item.request_channel)?.[1] || 'Não indicado'}</strong></div>
              <div><small>CONFIRMAÇÃO</small><strong>{formatDate(item.supplier_confirmed_at)}</strong></div>
              <div><small>PREVISÃO DE CHEGADA</small><strong>{formatDate(item.expected_at)}</strong></div>
              <div><small>DATA DE RECEÇÃO</small><strong>{formatDate(item.received_at)}</strong></div>
              <div><small>MÉDIA DO FORNECEDOR</small><strong>{supplierAverageDays != null ? `≈ ${supplierAverageDays} dias` : 'Sem histórico suficiente'}</strong></div>
            </div>}
          </section>

          <section className="fabric-info-section">
            <div className="section-title"><ScrollText size={18}/><strong>Ficha técnica e utilização</strong></div>
            {editing ? <div className="fabric-edit-grid">
              <label>Artigo<input value={form.article} onChange={event => setForm({ ...form, article: event.target.value })}/></label>
              <label>Composição<input value={form.composition} onChange={event => setForm({ ...form, composition: event.target.value })}/></label>
              <label>Cor<input value={form.color} onChange={event => setForm({ ...form, color: event.target.value })}/></label>
              <label>Gramagem<input value={form.grammage} onChange={event => setForm({ ...form, grammage: event.target.value })}/></label>
              <label>Largura<input value={form.width} onChange={event => setForm({ ...form, width: event.target.value })}/></label>
              <label>Quantidade (m)<input type="number" step="0.5" min="0" value={form.quantity_meters} onChange={event => setForm({ ...form, quantity_meters: event.target.value })}/></label>
              <label>Preço €/m<input type="number" step="0.01" min="0" value={form.price_per_meter} onChange={event => setForm({ ...form, price_per_meter: event.target.value })}/></label>
              <label className="fabric-wide-field">Instruções de tingimento/acabamento<textarea value={form.treatment_notes} onChange={event => setForm({ ...form, treatment_notes: event.target.value })}/></label>
              <label className="fabric-wide-field">Notas e histórico importado<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/></label>
            </div> : <>
              <div className="fabric-definition-grid technical">
                <div><small>ARTIGO</small><strong>{item.article || '—'}</strong></div><div><small>COMPOSIÇÃO</small><strong>{item.composition || '—'}</strong></div>
                <div><small>COR</small><strong>{item.color || '—'}</strong></div><div><small>GRAMAGEM</small><strong>{item.grammage ? `${item.grammage} g/m²` : '—'}</strong></div>
                <div><small>LARGURA</small><strong>{item.width ? `${item.width} m` : '—'}</strong></div><div><small>QUANTIDADE</small><strong>{item.quantity_meters ? `${item.quantity_meters} m` : '—'}</strong></div>
                <div><small>PREÇO</small><strong>{item.price_per_meter ? `${item.price_per_meter.toFixed(2)} €/m` : '—'}</strong></div><div><small>VALOR ESTIMADO</small><strong>{totalValue != null ? `${totalValue.toFixed(2)} €` : '—'}</strong></div>
              </div>
              {item.treatment_notes && <div className="fabric-treatment"><strong>Tingimento / acabamento</strong><p>{item.treatment_notes}</p></div>}
            </>}
          </section>

          <section className="fabric-info-section">
            <div className="section-title"><Clock3 size={18}/><strong>Histórico do pedido</strong></div>
            <div className="fabric-timeline">
              <div><span/><time>{formatDate(item.requested_at)}</time><p>Pedido registado{item.requested_to ? ` a ${item.requested_to}` : ''}{item.request_channel ? ` por ${CHANNELS.find(([value]) => value === item.request_channel)?.[1] || item.request_channel}` : ''}.</p></div>
              {item.supplier_confirmed_at && <div><span/><time>{formatDate(item.supplier_confirmed_at)}</time><p>Fornecedor confirmou o pedido.</p></div>}
              {noteLines.map((line, index) => <div key={`${line}-${index}`}><span/><time>Nota</time><p>{line}</p></div>)}
              {item.received_at && <div><span/><time>{formatDate(item.received_at)}</time><p>Rolo/metros recebidos após {item.days_to_receive ?? '—'} dias.</p></div>}
            </div>
          </section>
        </main>

        <aside>
          <section className="fabric-side-section">
            <div className="section-title"><Paperclip size={18}/><strong>Fotografias e documentos</strong></div>
            <div className="fabric-attachment-list">{item.attachments.map(file => <div key={file.url}>{file.mime_type.includes('pdf') ? <FileText/> : <img src={file.url} alt=""/>}<a href={file.url} target="_blank" rel="noreferrer">{file.name}</a><button type="button" onClick={() => void removeAttachment(file.url)} aria-label={`Remover ${file.name}`}>×</button></div>)}</div>
            {item.attachments.length === 0 && <p className="empty-note">Ainda sem anexos.</p>}
            <label className="secondary-button fabric-upload-button"><Paperclip size={15}/>{uploading ? 'A enviar…' : 'Anexar foto ou PDF'}<input hidden type="file" accept="image/*,application/pdf" onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }}/></label>
            <QrFileUpload onReceived={file => void addAttachment(file)}/>
          </section>

          <section className="fabric-side-section">
            <strong>Etiquetas operacionais</strong>
            <p className="section-help">Leitura rápida de stock, pendências e administração.</p>
            <LabelPicker all={labels} applied={item.labels} onChange={ids => void onPatch({ label_ids: ids })}/>
          </section>

          <section className="fabric-side-section">
            <strong>Modelos associados</strong>
            <div className="fabric-model-links">{item.developments.map(link => <div key={link.id}><span><strong>{link.code}</strong>{link.title}</span><em>{link.relation_type}</em>{link.link_id && <button type="button" onClick={() => void onRemoveDevelopment(link.link_id!)}>×</button>}</div>)}</div>
            {item.developments.length === 0 && <p className="empty-note">Ainda sem modelo associado.</p>}
            <label>Adicionar modelo<select value={newDevelopmentId} onChange={event => setNewDevelopmentId(event.target.value)}><option value="">Selecionar...</option>{developments.filter(development => !item.developments.some(link => link.id === development.id)).map(development => <option key={development.id} value={development.id}>{development.code} — {development.title}</option>)}</select></label>
            <label>Utilização<select value={relationType} onChange={event => setRelationType(event.target.value)}><option value="candidate">Candidata</option><option value="tested">Testada</option><option value="approved">Aprovada</option><option value="production">Produção</option><option value="alternative">Alternativa</option><option value="rejected">Rejeitada</option></select></label>
            <button type="button" className="secondary-button" disabled={!newDevelopmentId} onClick={() => { void onAddDevelopment(Number(newDevelopmentId), relationType).then(() => setNewDevelopmentId('')) }}>Associar modelo</button>
          </section>

          <button type="button" className="action danger" onClick={onDelete}><Trash2 size={15}/>Eliminar pedido</button>
        </aside>
      </div>
    </article>
  </div>
}
