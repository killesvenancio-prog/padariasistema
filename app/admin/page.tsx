'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { formatarQuantidade } from '@/lib/format'
import { comprimirImagem, tipoDaImagem } from '@/lib/imagem'
import { listarModelos, salvarModelo, removerModelo, type ModeloCardapio } from '@/lib/modelosCardapio'
import {
  LayoutDashboard, ClipboardList, CalendarDays, Package, Store, Lock, ImageIcon,
  Search, Printer, Download, Bell, BellOff, AlertTriangle, X, RotateCcw, Loader2, Plus, Save, Table, Camera,
} from 'lucide-react'

interface ItemHoje {
  produto_id: number
  nome: string
  categoria: string
  emoji: string | null
  preco: number
  unidade: string
  ligado: boolean
  quantidade: number
}

interface ProdutoAdmin {
  id: number
  nome: string
  descricao: string | null
  preco: number
  categoria: string
  emoji: string | null
  foto_url: string | null
  unidade: string
  ativo: boolean
  a_verificar?: boolean
}

interface ItemPedido {
  nome: string
  quantidade: number
  modo: 'un' | 'kg'
  unidade: string
}
interface PedidoAdmin {
  id: number
  created_at: string
  modo: string
  mesa_numero: number | null
  endereco: string | null
  cliente_nome: string | null
  cliente_telefone: string | null
  observacao: string | null
  total: number
  status: string
  itens: ItemPedido[]
}

const STATUS_LABEL: Record<string, string> = {
  recebido: 'Recebido',
  preparando: 'Preparando',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}
const STATUS_FILTROS = ['todos', 'recebido', 'preparando', 'pronto', 'entregue', 'cancelado']

function badgeStatus(s: string): string {
  if (s === 'recebido') return 'bg-amber-100 text-amber-800'
  if (s === 'preparando') return 'bg-blue-100 text-blue-800'
  if (s === 'pronto') return 'bg-green-100 text-green-800'
  if (s === 'entregue') return 'bg-muted text-muted-foreground'
  return 'bg-red-100 text-red-800'
}
function labelModo(p: PedidoAdmin): string {
  if (p.modo === 'mesa') return `Mesa ${p.mesa_numero ?? ''}`
  if (p.modo === 'entrega') return `Entrega: ${p.endereco ?? ''}`
  return 'Retirada no balcão'
}

const CATEGORIAS = ['Pães', 'Confeitaria', 'Doces', 'Doces coloniais', 'Chocolates', 'Salgados', 'Salgadinhos', 'Congelados', 'Mercearia', 'Bebidas', 'Vinhos', 'Cigarros']

// "Estoque baixo": <= 1 kg (peso) ou <= 5 un.
function estoqueBaixo(it: ItemHoje): boolean {
  if (!it.ligado || it.quantidade <= 0) return false
  return it.unidade === 'kg' ? it.quantidade <= 1 : it.quantidade <= 5
}

// Bipe curto (Web Audio) pra avisar pedido novo — sem precisar de arquivo de áudio.
function tocarBeep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const notas = [880, 1175]
    notas.forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.type = 'sine'
      o.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
      o.start(t0)
      o.stop(t0 + 0.18)
    })
    setTimeout(() => ctx.close(), 600)
  } catch {
    /* navegador bloqueou áudio — o aviso visual continua */
  }
}

// HTML da comanda (impressa numa janela à parte — robusto e independente do layout).
function montarComandaHTML(pd: PedidoAdmin): string {
  const esc = (s: unknown) => String(s ?? '').replace(/[<>&]/g, (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'))
  const hora = new Date(pd.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const dest = pd.modo === 'mesa' ? `MESA ${pd.mesa_numero ?? ''}` : pd.modo === 'entrega' ? 'ENTREGA' : 'RETIRADA NO BALCÃO'
  const itens = pd.itens
    .map((it) => {
      const pesar = it.modo === 'un' && it.unidade === 'kg' ? ' <span class="pesar">(a pesar)</span>' : ''
      return `<div class="it"><span class="chk"></span><span class="q">${formatarQuantidade(Number(it.quantidade), it.modo)}</span><span class="nm">${esc(it.nome)}${pesar}</span></div>`
    })
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Comanda #${pd.id}</title>
  <style>
    @page { margin: 6mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; width: 280px; margin: 0 auto; padding: 4px; color: #000; }
    .top { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .marca { font-size: 17px; font-weight: 800; letter-spacing: .3px; }
    .tag { font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 3px; }
    .head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .num { font-size: 24px; font-weight: 800; line-height: 1; }
    .hora { font-size: 12px; }
    .dest { text-align: center; font-size: 16px; font-weight: 800; border: 2px solid #000; border-radius: 8px; padding: 7px; margin-bottom: 8px; }
    .info { font-size: 12px; margin: 3px 0; }
    .itens { margin: 10px 0; }
    .it { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; border-bottom: 1px dashed #bbb; }
    .chk { width: 15px; height: 15px; border: 2px solid #000; border-radius: 3px; flex-shrink: 0; margin-top: 1px; }
    .q { font-weight: 800; font-size: 14px; min-width: 46px; }
    .nm { font-size: 14px; flex: 1; }
    .pesar { font-size: 11px; font-weight: normal; }
    .tot { display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; border-top: 2px solid #000; padding-top: 8px; }
    .obs { font-size: 12px; margin-top: 10px; border: 1px dashed #000; border-radius: 6px; padding: 7px; }
    .obs b { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
    .foot { text-align: center; font-size: 11px; margin-top: 14px; }
  </style></head><body>
    <div class="top">
      <div class="marca">PADARIA SANTA CECÍLIA</div>
      <div class="tag">Comanda da cozinha</div>
    </div>
    <div class="head">
      <span class="num">#${pd.id}</span>
      <span class="hora">${hora}</span>
    </div>
    <div class="dest">${dest}</div>
    ${pd.modo === 'entrega' && pd.endereco ? `<div class="info">Endereço: ${esc(pd.endereco)}</div>` : ''}
    ${pd.cliente_nome ? `<div class="info">Cliente: <b>${esc(pd.cliente_nome)}</b></div>` : ''}
    ${pd.cliente_telefone ? `<div class="info">Tel: ${esc(pd.cliente_telefone)}</div>` : ''}
    <div class="itens">${itens}</div>
    <div class="tot"><span>TOTAL</span><span>R$ ${Number(pd.total).toFixed(2)}</span></div>
    ${pd.observacao ? `<div class="obs"><b>Observação</b>${esc(pd.observacao)}</div>` : ''}
    <div class="foot">Pedido #${pd.id} &middot; obrigado!</div>
  </body></html>`
}

const formVazio = {
  id: null as number | null,
  nome: '',
  descricao: '',
  preco: '',
  categoria: 'Pães',
  unidade: 'un' as 'un' | 'kg',
  emoji: '',
  foto_url: null as string | null,
}

// Linha editável da aba "Tabela" (preço pode ficar string durante a edição).
type LinhaProduto = Omit<ProdutoAdmin, 'preco'> & { preco: number | string }

// Uma foto de produto sendo classificada pela IA.
type FotoProduto = {
  key: string
  dataUrl: string
  status: 'analisando' | 'ok' | 'erro'
  produto_id: number | null
  nome: string
  categoria: string
}

const LinhaTabela = memo(function LinhaTabela({
  p,
  onChange,
  onUpload,
  onToggleVerificar,
}: {
  p: LinhaProduto
  onChange: (id: number, campo: keyof LinhaProduto, valor: string | number | boolean) => void
  onUpload: (id: number, file: File) => void
  onToggleVerificar: (id: number, valor: boolean) => void
}) {
  const cel = 'w-full border border-transparent hover:border-border focus:border-primary rounded px-2 py-1 bg-transparent focus:bg-card text-sm outline-none'
  return (
    <tr className={`border-b border-border ${p.ativo ? '' : 'opacity-50'}`}>
      <td className="p-1">
        <label className="w-11 h-11 rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center cursor-pointer" title="Trocar foto">
          {p.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.foto_url} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(p.id, f) }} />
        </label>
      </td>
      <td className="p-1">
        <input value={p.nome} onChange={(e) => onChange(p.id, 'nome', e.target.value)} className={`${cel} min-w-[150px] font-medium`} />
      </td>
      <td className="p-1">
        <input value={p.descricao ?? ''} onChange={(e) => onChange(p.id, 'descricao', e.target.value)} placeholder="—" className={`${cel} min-w-[160px] text-muted-foreground`} />
      </td>
      <td className="p-1">
        <select value={p.categoria} onChange={(e) => onChange(p.id, 'categoria', e.target.value)} className="border border-border rounded px-1.5 py-1 bg-card text-sm">
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="p-1">
        <select value={p.unidade} onChange={(e) => onChange(p.id, 'unidade', e.target.value)} className="border border-border rounded px-1.5 py-1 bg-card text-sm">
          <option value="un">un</option>
          <option value="kg">kg</option>
        </select>
      </td>
      <td className="p-1">
        <input type="number" step="0.01" min="0" value={p.preco} onChange={(e) => onChange(p.id, 'preco', e.target.value)} className="w-20 border border-border rounded px-1.5 py-1 bg-card text-sm text-right" />
      </td>
      <td className="p-1 text-center">
        <input type="checkbox" checked={p.ativo} onChange={(e) => onChange(p.id, 'ativo', e.target.checked)} className="w-4 h-4" />
      </td>
      <td className="p-1 text-center">
        <input type="checkbox" checked={!!p.a_verificar} onChange={(e) => onToggleVerificar(p.id, e.target.checked)} className="w-4 h-4 accent-amber-500" title="A verificar disponibilidade" />
      </td>
    </tr>
  )
})

export default function AdminPage() {
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [logado, setLogado] = useState(false)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState<string | null>(null)

  const [aba, setAba] = useState<'resumo' | 'pedidos' | 'cardapio' | 'produtos' | 'tabela'>('resumo')
  const [itensHoje, setItensHoje] = useState<ItemHoje[]>([])
  const [qtds, setQtds] = useState<Record<number, number>>({})
  const [produtos, setProdutos] = useState<ProdutoAdmin[]>([])
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  // Filtros / busca / som (modo cozinha + gestão)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [buscaPedido, setBuscaPedido] = useState('')
  const [catProduto, setCatProduto] = useState('Todas')
  const [som, setSom] = useState(true)

  // Cardápio de hoje: busca, filtros e ações em massa
  const [buscaCardapio, setBuscaCardapio] = useState('')
  const [catCardapio, setCatCardapio] = useState('Todas')
  const [filtroLigado, setFiltroLigado] = useState<'todos' | 'ligados' | 'desligados'>('todos')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Adicionar vários itens de uma vez (bolos/mousses do dia etc.)
  const [varAberto, setVarAberto] = useState(false)
  const [varTexto, setVarTexto] = useState('')
  const [varCat, setVarCat] = useState('Confeitaria')
  const [varUnidade, setVarUnidade] = useState<'un' | 'kg'>('un')
  const [varQtd, setVarQtd] = useState('10')
  const [varSalvando, setVarSalvando] = useState(false)

  // Modelos de cardápio salvos
  const [modelos, setModelos] = useState<ModeloCardapio[]>([])

  // Aba "Tabela" (edição em massa)
  const [tabela, setTabela] = useState<LinhaProduto[]>([])
  const [dirty, setDirty] = useState<Set<number>>(new Set())
  const [buscaTabela, setBuscaTabela] = useState('')

  // Fotografar produtos (IA reconhece cada foto)
  const [balcaoAberto, setBalcaoAberto] = useState(false)
  const [balcaoLoading, setBalcaoLoading] = useState(false)
  const [fotos, setFotos] = useState<FotoProduto[]>([])
  const [balcaoQtd, setBalcaoQtd] = useState('10')

  const [form, setForm] = useState(formVazio)
  const [formAberto, setFormAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)

  // Detecção de pedido novo (refs pra funcionar dentro do intervalo)
  const baselineRef = useRef(0)
  const primeiraCargaRef = useRef(true)
  const somRef = useRef(true)

  useEffect(() => {
    somRef.current = som
  }, [som])

  useEffect(() => {
    verificarSessao()
    try {
      setSom(localStorage.getItem('padaria_admin_som') !== 'off')
    } catch {
      /* ignora */
    }
    setModelos(listarModelos())
  }, [])

  // Mantém a tabela editável em sincronia com o catálogo carregado.
  useEffect(() => {
    setTabela(produtos.map((p) => ({ ...p })))
    setDirty(new Set())
  }, [produtos])

  const onChangeLinha = useCallback((id: number, campo: keyof LinhaProduto, valor: string | number | boolean) => {
    setTabela((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)))
    setDirty((prev) => {
      const n = new Set(prev)
      n.add(id)
      return n
    })
  }, [])

  // Upload de foto direto numa linha da tabela (salva na hora).
  const handleUploadLinha = useCallback(async (id: number, file: File) => {
    setMsg('Enviando foto...')
    const otimizada = await comprimirImagem(file)
    const { ext, contentType } = tipoDaImagem(otimizada, file.name)
    const path = `produto-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('produtos').upload(path, otimizada, { upsert: true, cacheControl: '3600', contentType })
    if (error) {
      setMsg('Erro no upload: ' + error.message)
      return
    }
    const { data } = supabase.storage.from('produtos').getPublicUrl(path)
    await supabase.from('produtos').update({ foto_url: data.publicUrl }).eq('id', id)
    setTabela((prev) => prev.map((p) => (p.id === id ? { ...p, foto_url: data.publicUrl } : p)))
    setMsg('Foto atualizada.')
  }, [])

  // Marca/desmarca "a verificar disponibilidade" (salva na hora).
  const onToggleVerificar = useCallback(async (id: number, valor: boolean) => {
    setTabela((prev) => prev.map((p) => (p.id === id ? { ...p, a_verificar: valor } : p)))
    const { error } = await supabase.from('produtos').update({ a_verificar: valor }).eq('id', id)
    if (error) {
      setMsg('Para usar "a verificar", rode antes o SQL a-verificar.sql no Supabase.')
      setTabela((prev) => prev.map((p) => (p.id === id ? { ...p, a_verificar: !valor } : p)))
    }
  }, [])

  function atualizaFoto(key: string, patch: Partial<FotoProduto>) {
    setFotos((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  }

  function removerFoto(key: string) {
    setFotos((prev) => prev.filter((f) => f.key !== key))
  }

  // Adiciona fotos: comprime, mostra na lista, e a IA classifica cada uma.
  async function adicionarFotos(lista: File[]) {
    const novas: FotoProduto[] = []
    for (const file of lista) {
      const otim = await comprimirImagem(file, 900, 0.82)
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result as string)
        fr.onerror = () => reject(new Error('read'))
        fr.readAsDataURL(otim)
      })
      novas.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dataUrl,
        status: 'analisando',
        produto_id: null,
        nome: '',
        categoria: 'Confeitaria',
      })
    }
    setFotos((prev) => [...prev, ...novas])
    for (const f of novas) {
      try {
        const { data, error } = await supabase.functions.invoke('balcao', { body: { imagem: f.dataUrl } })
        if (error || !data || data.erro) {
          atualizaFoto(f.key, { status: 'erro' })
          continue
        }
        atualizaFoto(f.key, {
          status: 'ok',
          produto_id: data.produto_id ?? null,
          nome: String(data.nome ?? ''),
          categoria: String(data.categoria ?? 'Confeitaria'),
        })
      } catch {
        atualizaFoto(f.key, { status: 'erro' })
      }
    }
  }

  // Confirma: cria os novos, sobe as fotos e liga tudo no dia (a verificar).
  async function confirmarFotos() {
    const validas = fotos.filter((f) => f.status === 'ok' && f.nome.trim())
    if (validas.length === 0) {
      setMsg('Nenhuma foto pronta para adicionar.')
      return
    }
    const qtd = Math.max(0, Number(balcaoQtd) || 0)
    setBalcaoLoading(true)
    let ok = 0
    for (const f of validas) {
      let pid = f.produto_id
      if (pid == null) {
        const ins = await supabase.from('produtos').insert({ nome: f.nome.trim(), categoria: f.categoria, unidade: 'un', ativo: true }).select().single()
        if (ins.error || !ins.data) continue
        pid = (ins.data as ProdutoAdmin).id
      }
      // sobe a foto (separado, pra não depender de outra coluna)
      try {
        const blob = await (await fetch(f.dataUrl)).blob()
        const path = `produto-${Date.now()}-${pid}.jpg`
        const up = await supabase.storage.from('produtos').upload(path, blob, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' })
        if (!up.error) {
          const { data } = supabase.storage.from('produtos').getPublicUrl(path)
          await supabase.from('produtos').update({ foto_url: data.publicUrl }).eq('id', pid)
        }
      } catch {
        /* segue sem foto */
      }
      // marca "a verificar" (ignora se a coluna ainda não existir)
      await supabase.from('produtos').update({ a_verificar: true }).eq('id', pid)
      // liga no cardápio de hoje
      await supabase.rpc('ligar_item_hoje', { p_produto_id: pid, p_quantidade: qtd })
      ok++
    }
    setBalcaoLoading(false)
    setBalcaoAberto(false)
    setFotos([])
    setMsg(`${ok} ${ok === 1 ? 'produto adicionado' : 'produtos adicionados'} ao dia.`)
    await carregarItens()
    await carregarProdutos()
  }

  async function salvarTabela() {
    const mudados = tabela.filter((p) => dirty.has(p.id))
    if (mudados.length === 0) {
      setMsg('Nada alterado para salvar.')
      return
    }
    setBulkLoading(true)
    await Promise.all(
      mudados.map((p) =>
        supabase
          .from('produtos')
          .update({
            nome: String(p.nome).trim(),
            descricao: p.descricao ? String(p.descricao).trim() : null,
            preco: Number(String(p.preco).replace(',', '.')) || 0,
            categoria: p.categoria,
            unidade: p.unidade,
            ativo: p.ativo,
            foto_url: p.foto_url,
          })
          .eq('id', p.id),
      ),
    )
    setBulkLoading(false)
    setMsg(`${mudados.length} ${mudados.length === 1 ? 'produto salvo' : 'produtos salvos'}.`)
    await carregarProdutos()
    await carregarItens()
  }

  // atualiza os pedidos sozinho enquanto a aba Pedidos ou Resumo está aberta
  useEffect(() => {
    if (!ehAdmin || (aba !== 'pedidos' && aba !== 'resumo')) return
    carregarPedidos()
    const t = setInterval(carregarPedidos, 15000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehAdmin, aba])

  async function verificarSessao() {
    setCarregando(true)
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      setLogado(true)
      await checarAdmin()
    }
    setCarregando(false)
  }

  async function checarAdmin() {
    const { data: admin } = await supabase.rpc('is_admin')
    setEhAdmin(!!admin)
    if (admin) {
      await carregarItens()
      await carregarProdutos()
      await carregarPedidos()
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setErroLogin(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErroLogin('Não foi possível entrar. Confira email e senha.')
      return
    }
    setLogado(true)
    await checarAdmin()
  }

  async function logout() {
    await supabase.auth.signOut()
    setLogado(false)
    setEhAdmin(false)
    setItensHoje([])
    setProdutos([])
  }

  async function carregarItens() {
    const { data, error } = await supabase.rpc('cardapio_admin_hoje')
    if (!error && data) {
      setItensHoje(data as ItemHoje[])
      const m: Record<number, number> = {}
      ;(data as ItemHoje[]).forEach((i) => {
        m[i.produto_id] = i.quantidade > 0 ? Number(i.quantidade) : i.unidade === 'kg' ? 5 : 20
      })
      setQtds(m)
    }
  }

  async function carregarProdutos() {
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .order('categoria')
      .order('nome')
    if (data) setProdutos(data as ProdutoAdmin[])
  }

  async function carregarPedidos() {
    const { data } = await supabase.rpc('pedidos_admin')
    if (data) {
      const lista = data as PedidoAdmin[]
      const maxId = lista.reduce((m, p) => Math.max(m, p.id), 0)
      if (primeiraCargaRef.current) {
        baselineRef.current = maxId
        primeiraCargaRef.current = false
      } else if (maxId > baselineRef.current) {
        const novos = lista.filter((p) => p.id > baselineRef.current).length
        baselineRef.current = maxId
        if (somRef.current) tocarBeep()
        toast(novos > 1 ? `${novos} novos pedidos chegaram!` : 'Novo pedido recebido!')
      }
      setPedidos(lista)
    }
  }

  async function mudarStatus(id: number, status: string) {
    const { error } = await supabase.rpc('atualizar_status_pedido', { p_id: id, p_status: status })
    if (error) setMsg('Erro: ' + error.message)
    await carregarPedidos()
  }

  async function ligar(item: ItemHoje) {
    const q = qtds[item.produto_id] ?? 20
    const { error } = await supabase.rpc('ligar_item_hoje', {
      p_produto_id: item.produto_id,
      p_quantidade: q,
    })
    setMsg(error ? `Erro: ${error.message}` : `${item.nome} ligado (${q} ${item.unidade === 'kg' ? 'kg' : 'un'})`)
    await carregarItens()
  }

  async function desligar(item: ItemHoje) {
    const { error } = await supabase.rpc('desligar_item_hoje', { p_produto_id: item.produto_id })
    setMsg(error ? `Erro: ${error.message}` : `${item.nome} desligado`)
    await carregarItens()
  }

  // Lista de itens do cardápio aplicando busca + categoria + status (ligado/desligado)
  function listaFiltradaCardapio(): ItemHoje[] {
    const q = buscaCardapio.trim().toLowerCase()
    return itensHoje.filter((it) => {
      const okCat = catCardapio === 'Todas' || it.categoria === catCardapio
      const okBusca = !q || it.nome.toLowerCase().includes(q)
      const okLig = filtroLigado === 'todos' || (filtroLigado === 'ligados' ? it.ligado : !it.ligado)
      return okCat && okBusca && okLig
    })
  }

  // Liga todos os itens visíveis no filtro atual (usa a quantidade já definida).
  async function ligarVisiveis() {
    const alvo = listaFiltradaCardapio().filter((it) => !it.ligado)
    if (alvo.length === 0) { setMsg('Nada para ligar no filtro atual.'); return }
    setBulkLoading(true)
    await Promise.all(alvo.map((it) =>
      supabase.rpc('ligar_item_hoje', {
        p_produto_id: it.produto_id,
        p_quantidade: qtds[it.produto_id] ?? (it.unidade === 'kg' ? 5 : 20),
      }),
    ))
    setBulkLoading(false)
    setMsg(`${alvo.length} ${alvo.length === 1 ? 'item ligado' : 'itens ligados'}.`)
    await carregarItens()
  }

  // Desliga todos os itens visíveis no filtro atual.
  async function desligarVisiveis() {
    const alvo = listaFiltradaCardapio().filter((it) => it.ligado)
    if (alvo.length === 0) { setMsg('Nada para desligar no filtro atual.'); return }
    setBulkLoading(true)
    await Promise.all(alvo.map((it) => supabase.rpc('desligar_item_hoje', { p_produto_id: it.produto_id })))
    setBulkLoading(false)
    setMsg(`${alvo.length} ${alvo.length === 1 ? 'item desligado' : 'itens desligados'}.`)
    await carregarItens()
  }

  // Repete o cardápio do dia anterior mais recente (liga os mesmos itens/quantidades).
  async function repetirUltimoCardapio() {
    setBulkLoading(true)
    const hojeISO = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).toLocaleDateString('en-CA')
    const { data, error } = await supabase
      .from('cardapio_dia')
      .select('produto_id, quantidade, data')
      .lt('data', hojeISO)
      .eq('disponivel', true)
      .order('data', { ascending: false })
    const linhas = (data ?? []) as Array<{ produto_id: number; quantidade: number; data: string }>
    if (error || linhas.length === 0) {
      setMsg('Não encontrei um cardápio anterior para repetir.')
      setBulkLoading(false)
      return
    }
    const ultimaData = linhas[0].data
    const doDia = linhas.filter((r) => r.data === ultimaData && Number(r.quantidade) > 0)
    await Promise.all(doDia.map((r) =>
      supabase.rpc('ligar_item_hoje', { p_produto_id: r.produto_id, p_quantidade: Number(r.quantidade) }),
    ))
    setBulkLoading(false)
    setMsg(`Cardápio de ${new Date(ultimaData + 'T12:00:00').toLocaleDateString('pt-BR')} repetido — ${doDia.length} ${doDia.length === 1 ? 'item ligado' : 'itens ligados'}.`)
    await carregarItens()
  }

  // Cria vários produtos de uma vez (1 por linha "Nome - preço") e liga todos hoje.
  async function adicionarVariosHoje() {
    const linhas = varTexto.split('\n').map((l) => l.trim()).filter(Boolean)
    if (linhas.length === 0) { setMsg('Escreva pelo menos um item.'); return }
    const qtd = Math.max(0, Number(varQtd) || 0)
    setVarSalvando(true)
    // Tira o preço do fim da linha (opcional); o resto é o nome.
    const itensParse = linhas
      .map((linha) => {
        const m = linha.match(/(\d+(?:[.,]\d{1,2})?)\s*$/)
        let preco = 0
        let nome = linha
        if (m && (m.index ?? 0) > 0) {
          preco = Number(m[1].replace(',', '.')) || 0
          nome = linha.slice(0, m.index).replace(/[\s\-–—:R$]+$/i, '').trim()
        }
        return { nome: nome || linha, preco }
      })
      .filter((x) => x.nome)
    const inseridos = await Promise.all(
      itensParse.map((it) =>
        supabase.from('produtos').insert({ nome: it.nome, preco: it.preco, categoria: varCat, unidade: varUnidade, ativo: true }).select().single(),
      ),
    )
    const validos = inseridos.filter((r) => !r.error && r.data).map((r) => r.data as ProdutoAdmin)
    await Promise.all(validos.map((p) => supabase.rpc('ligar_item_hoje', { p_produto_id: p.id, p_quantidade: qtd })))
    setVarSalvando(false)
    setVarAberto(false)
    setVarTexto('')
    setMsg(`${validos.length} ${validos.length === 1 ? 'item adicionado' : 'itens adicionados'} ao cardápio de hoje.`)
    await carregarProdutos()
    await carregarItens()
  }

  // ----- Modelos de cardápio -----
  function salvarModeloAtual() {
    const ligados = itensHoje
      .filter((i) => i.ligado)
      .map((i) => ({ produto_id: i.produto_id, quantidade: Number(qtds[i.produto_id] ?? i.quantidade) || 0 }))
    if (ligados.length === 0) {
      setMsg('Ligue os itens que quer salvar antes de criar o modelo.')
      return
    }
    const nome = (window.prompt('Nome do modelo (ex.: Dia de semana, Sábado, Dia de bolo):') || '').trim()
    if (!nome) return
    setModelos(salvarModelo(nome, ligados))
    setMsg(`Modelo "${nome}" salvo com ${ligados.length} itens.`)
  }

  async function aplicarModelo(m: ModeloCardapio) {
    setBulkLoading(true)
    await Promise.all(m.itens.map((it) => supabase.rpc('ligar_item_hoje', { p_produto_id: it.produto_id, p_quantidade: it.quantidade })))
    setBulkLoading(false)
    setMsg(`Modelo "${m.nome}" aplicado — ${m.itens.length} itens ligados.`)
    await carregarItens()
  }

  function excluirModelo(id: string) {
    setModelos(removerModelo(id))
  }

  function alternarSom() {
    setSom((s) => {
      const n = !s
      try {
        localStorage.setItem('padaria_admin_som', n ? 'on' : 'off')
      } catch {
        /* ignora */
      }
      if (n) tocarBeep()
      return n
    })
  }

  function imprimirComanda(pd: PedidoAdmin) {
    const w = window.open('', '_blank', 'width=320,height=600')
    if (!w) {
      setMsg('Para imprimir a comanda, permita pop-ups deste site no navegador.')
      return
    }
    w.document.write(montarComandaHTML(pd))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 250)
  }

  function abrirNovo() {
    setForm(formVazio)
    setFormAberto(true)
  }

  async function handleUpload(file: File) {
    setUploadando(true)
    // Comprime no navegador antes de enviar (deixa o upload rápido).
    const otimizada = await comprimirImagem(file)
    const { ext, contentType } = tipoDaImagem(otimizada, file.name)
    const path = `produto-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('produtos')
      .upload(path, otimizada, { upsert: true, cacheControl: '3600', contentType })
    setUploadando(false)
    if (error) {
      setMsg('Erro no upload da foto: ' + error.message)
      return
    }
    const { data } = supabase.storage.from('produtos').getPublicUrl(path)
    setForm((f) => ({ ...f, foto_url: data.publicUrl }))
  }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.preco) {
      setMsg('Preencha nome e preço.')
      return
    }
    setSalvando(true)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco: Number(form.preco),
      categoria: form.categoria,
      unidade: form.unidade,
      emoji: form.emoji.trim() || null,
      foto_url: form.foto_url || null,
    }
    const res = form.id
      ? await supabase.from('produtos').update(payload).eq('id', form.id).select().single()
      : await supabase.from('produtos').insert(payload).select().single()
    setSalvando(false)
    if (res.error) {
      setMsg('Erro ao salvar: ' + res.error.message)
      return
    }
    // Atualiza a lista localmente (sem recarregar tudo -> instantâneo)
    const salvo = res.data as ProdutoAdmin
    setProdutos((prev) => {
      const semEle = prev.filter((p) => p.id !== salvo.id)
      return [...semEle, salvo].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))
    })
    setMsg(form.id ? 'Produto atualizado' : 'Produto criado')
    setFormAberto(false)
    // Atualiza a aba "Cardápio de Hoje" em segundo plano (não trava o salvar).
    carregarItens()
  }

  // ---------- TELAS ----------

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!logado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <form onSubmit={login} className="w-full max-w-sm bg-card rounded-2xl shadow-lg border border-border p-8 space-y-4">
          <div className="text-center mb-2">
            <Store className="w-9 h-9 mx-auto text-primary" />
            <h1 className="text-xl font-bold font-heading mt-2">Painel do Dono</h1>
            <p className="text-sm text-muted-foreground">Padaria Santa Cecília</p>
          </div>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded-xl px-4 py-3 bg-background" />
          <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required className="w-full border rounded-xl px-4 py-3 bg-background" />
          {erroLogin && <p className="text-destructive text-sm">{erroLogin}</p>}
          <button type="submit" className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium hover:bg-primary/90 transition-colors">Entrar</button>
        </form>
      </div>
    )
  }

  if (!ehAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium mb-2">Esta conta não é de administrador.</p>
        <button onClick={logout} className="mt-2 text-primary underline">Sair</button>
      </div>
    )
  }

  // ---- Estatísticas de hoje (calculadas dos pedidos carregados) ----
  const hojeStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const pedidosHoje = pedidos.filter(
    (p) => new Date(p.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === hojeStr
  )
  const naoCancelados = pedidosHoje.filter((p) => p.status !== 'cancelado')
  const faturamentoHoje = naoCancelados.reduce((s, p) => s + Number(p.total), 0)
  const pendentesHoje = pedidosHoje.filter((p) => p.status === 'recebido' || p.status === 'preparando').length
  const ticketMedio = naoCancelados.length ? faturamentoHoje / naoCancelados.length : 0
  const contagemItens: Record<string, number> = {}
  pedidosHoje.forEach((p) => p.itens.forEach((it) => { contagemItens[it.nome] = (contagemItens[it.nome] || 0) + 1 }))
  const maisVendidos = Object.entries(contagemItens).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const porModo = (['mesa', 'retirada', 'entrega'] as const).map((m) => ({
    modo: m === 'mesa' ? 'Mesa' : m === 'retirada' ? 'Retirada' : 'Entrega',
    n: pedidosHoje.filter((p) => p.modo === m).length,
  }))
  const dias: { label: string; n: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    dias.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      n: pedidos.filter((p) => new Date(p.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === ds).length,
    })
  }
  const maxDias = Math.max(1, ...dias.map((d) => d.n))
  const maxModo = Math.max(1, ...porModo.map((m) => m.n))
  const maxVend = Math.max(1, ...maisVendidos.map(([, n]) => n))

  // Pedidos filtrados (status + busca)
  const q = buscaPedido.trim().toLowerCase()
  const pedidosFiltrados = pedidos.filter((p) => {
    const okStatus = filtroStatus === 'todos' ? true : p.status === filtroStatus
    const okBusca =
      !q ||
      String(p.id).includes(q) ||
      (p.cliente_nome ?? '').toLowerCase().includes(q) ||
      String(p.mesa_numero ?? '').includes(q)
    return okStatus && okBusca
  })

  const itensBaixos = itensHoje.filter(estoqueBaixo).length
  const categoriasCardapio = Array.from(new Set(itensHoje.map((i) => i.categoria)))
  const ligadosCount = itensHoje.filter((i) => i.ligado).length
  const itensCardapioFiltrados = listaFiltradaCardapio()
  const qTab = buscaTabela.trim().toLowerCase()
  const tabelaFiltrada = tabela.filter((p) => {
    const okCat = catProduto === 'Todas' || p.categoria === catProduto
    const okBusca = !qTab || p.nome.toLowerCase().includes(qTab) || p.categoria.toLowerCase().includes(qTab)
    return okCat && okBusca
  })
  const qtdMudados = dirty.size

  function exportarCSV() {
    if (pedidosHoje.length === 0) {
      setMsg('Ainda não há pedidos hoje pra exportar.')
      return
    }
    const cab = ['Pedido', 'Hora', 'Tipo', 'Mesa/Endereco', 'Cliente', 'Telefone', 'Itens', 'Total', 'Status']
    const linhas = pedidosHoje.map((p) => {
      const hora = new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const tipo = p.modo === 'mesa' ? 'Mesa' : p.modo === 'entrega' ? 'Entrega' : 'Retirada'
      const dest = p.modo === 'mesa' ? `Mesa ${p.mesa_numero ?? ''}` : p.modo === 'entrega' ? (p.endereco ?? '') : '-'
      const itens = p.itens.map((it) => `${formatarQuantidade(Number(it.quantidade), it.modo)} ${it.nome}`).join(' | ')
      return [`#${p.id}`, hora, tipo, dest, p.cliente_nome ?? '', p.cliente_telefone ?? '', itens, Number(p.total).toFixed(2), STATUS_LABEL[p.status] ?? p.status]
    })
    const csv = [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendas-${hojeStr}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Menu lateral */}
      <aside className="bg-[oklch(0.2_0.018_40)] text-white md:w-60 md:shrink-0 md:min-h-screen md:sticky md:top-0 flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <Store className="w-6 h-6" />
          <div>
            <p className="font-heading font-bold leading-none">Painel do Dono</p>
            <p className="text-[11px] text-white/60 mt-0.5">Santa Cecília</p>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 p-3 md:flex-1 overflow-x-auto">
          {([['resumo', 'Resumo', LayoutDashboard], ['pedidos', 'Pedidos', ClipboardList], ['cardapio', 'Cardápio de Hoje', CalendarDays], ['tabela', 'Produtos', Table]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left whitespace-nowrap transition-colors ${
                aba === id ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {id === 'pedidos' && pendentesHoje > 0 && (
                <span className="ml-auto bg-amber-400 text-black text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendentesHoje}</span>
              )}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="m-3 text-sm text-white/70 hover:text-white hover:bg-white/5 text-left px-3 py-2 rounded-lg">
          ↩ Sair
        </button>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto">
        {msg && (
          <div className="mb-4 bg-card border border-border rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>{msg}</span>
            <button onClick={() => setMsg(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ---------- ABA RESUMO ---------- */}
        {aba === 'resumo' && (
          <>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-heading text-2xl font-bold">Resumo de hoje</h2>
                <p className="text-sm text-muted-foreground mb-5 capitalize">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button
                onClick={exportarCSV}
                className="inline-flex items-center gap-2 text-sm border border-border rounded-xl px-4 py-2 hover:bg-secondary transition-colors"
              >
                <Download className="w-4 h-4" /> Exportar vendas (CSV)
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pedidos hoje</p>
                <p className="text-3xl font-bold mt-1">{pedidosHoje.length}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Faturamento hoje</p>
                <p className="text-3xl font-bold mt-1">R$ {faturamentoHoje.toFixed(2)}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
                <p className="text-3xl font-bold mt-1">{pendentesHoje}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Ticket médio</p>
                <p className="text-3xl font-bold mt-1">R$ {ticketMedio.toFixed(2)}</p>
              </div>
            </div>

            {itensBaixos > 0 && (
              <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {itensBaixos} {itensBaixos === 1 ? 'item está' : 'itens estão'} com estoque baixo no cardápio de hoje.
                <button onClick={() => setAba('cardapio')} className="ml-auto font-medium underline">ver</button>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="font-semibold mb-4">Pedidos nos últimos 7 dias</h3>
                <div className="flex items-end gap-2 h-36">
                  {dias.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-xs font-semibold">{d.n}</span>
                      <div className="w-full bg-primary rounded-t-md" style={{ height: `${(d.n / maxDias) * 100}%`, minHeight: d.n > 0 ? '4px' : '0px' }} />
                      <span className="text-[10px] text-muted-foreground capitalize">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="font-semibold mb-4">Por tipo de pedido (hoje)</h3>
                <div className="space-y-3 pt-1">
                  {porModo.map((m) => (
                    <div key={m.modo}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{m.modo}</span>
                        <span className="font-semibold">{m.n}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(m.n / maxModo) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="font-semibold mb-3">Mais pedidos hoje</h3>
                {maisVendidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem pedidos ainda hoje.</p>
                ) : (
                  <div className="space-y-2.5">
                    {maisVendidos.map(([nome, qtd]) => (
                      <div key={nome}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="truncate pr-2">{nome}</span>
                          <span className="font-semibold text-muted-foreground">{qtd}x</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(qtd / maxVend) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Últimos pedidos</h3>
                  <button onClick={() => setAba('pedidos')} className="text-xs text-primary font-medium">ver todos</button>
                </div>
                {pedidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {pedidos.slice(0, 5).map((pd) => (
                      <li key={pd.id} className="flex items-center justify-between text-sm">
                        <span>#{pd.id} · {new Date(pd.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeStatus(pd.status)}`}>{STATUS_LABEL[pd.status] ?? pd.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-4">
              Faturamento considera o valor fechado dos pedidos. Itens vendidos por peso entram no valor final na pesagem.
            </p>
          </>
        )}

        {/* ---------- ABA PEDIDOS ---------- */}
        {aba === 'pedidos' && (
          <>
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">Pedidos · atualiza sozinho a cada 15s</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={alternarSom}
                  className={`inline-flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 transition-colors ${som ? 'border-border' : 'border-border text-muted-foreground'}`}
                  title={som ? 'Som de novo pedido ligado' : 'Som desligado'}
                >
                  {som ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  {som ? 'Som ligado' : 'Som mudo'}
                </button>
                <button onClick={carregarPedidos} className="text-sm border border-border rounded-lg px-3 py-1.5">↻ Atualizar</button>
              </div>
            </div>

            {/* Busca + filtros de status */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={buscaPedido}
                onChange={(e) => setBuscaPedido(e.target.value)}
                placeholder="Buscar por nº do pedido, cliente ou mesa..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
              {STATUS_FILTROS.map((s) => {
                const n = s === 'todos' ? pedidos.length : pedidos.filter((p) => p.status === s).length
                const ativo = filtroStatus === s
                return (
                  <button
                    key={s}
                    onClick={() => setFiltroStatus(s)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                      ativo ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
                    <span className={`text-xs ${ativo ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{n}</span>
                  </button>
                )
              })}
            </div>

            {pedidosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                {pedidos.length === 0 ? 'Nenhum pedido ainda. Os pedidos do cliente aparecem aqui na hora.' : 'Nenhum pedido neste filtro.'}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pedidosFiltrados.map((pd) => (
                  <div key={pd.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          Pedido #{pd.id}
                          <span className="text-xs text-muted-foreground font-normal">
                            {' '}· {new Date(pd.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{labelModo(pd)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeStatus(pd.status)}`}>
                        {STATUS_LABEL[pd.status] ?? pd.status}
                      </span>
                    </div>

                    {(pd.cliente_nome || pd.cliente_telefone) && (
                      <p className="text-sm mt-2">
                        {pd.cliente_nome}
                        {pd.cliente_telefone ? ` · ${pd.cliente_telefone}` : ''}
                      </p>
                    )}

                    <ul className="text-sm mt-2 space-y-0.5">
                      {pd.itens.map((it, idx) => (
                        <li key={idx}>
                          • {formatarQuantidade(Number(it.quantidade), it.modo)} — {it.nome}
                          {it.modo === 'un' && it.unidade === 'kg' ? ' (a pesar)' : ''}
                        </li>
                      ))}
                    </ul>

                    {pd.observacao && <p className="text-xs text-muted-foreground mt-1">Obs.: {pd.observacao}</p>}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border gap-2 flex-wrap">
                      <span className="font-bold">Total: R$ {Number(pd.total).toFixed(2)}</span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        <button onClick={() => imprimirComanda(pd)} className="text-xs border border-border rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1" title="Imprimir comanda">
                          <Printer className="w-3.5 h-3.5" /> Comanda
                        </button>
                        {!['preparando', 'entregue', 'cancelado'].includes(pd.status) && (
                          <button onClick={() => mudarStatus(pd.id, 'preparando')} className="text-xs bg-primary text-primary-foreground rounded-lg px-3 py-1.5">Preparando</button>
                        )}
                        {!['pronto', 'entregue', 'cancelado'].includes(pd.status) && (
                          <button onClick={() => mudarStatus(pd.id, 'pronto')} className="text-xs bg-primary text-primary-foreground rounded-lg px-3 py-1.5">Pronto</button>
                        )}
                        {!['entregue', 'cancelado'].includes(pd.status) && (
                          <button onClick={() => mudarStatus(pd.id, 'entregue')} className="text-xs border border-border rounded-lg px-3 py-1.5">Entregue</button>
                        )}
                        {!['entregue', 'cancelado'].includes(pd.status) && (
                          <button onClick={() => mudarStatus(pd.id, 'cancelado')} className="text-xs text-destructive border border-destructive/30 rounded-lg px-3 py-1.5">Cancelar</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- ABA CARDÁPIO DE HOJE ---------- */}
        {aba === 'cardapio' && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">Ligue o que tem hoje. O cliente só vê o que está ligado.</p>
              <span className="text-sm font-semibold whitespace-nowrap">{ligadosCount} de {itensHoje.length} ligados</span>
            </div>

            {/* Repetir cardápio + busca */}
            <div className="flex gap-2 flex-wrap mt-3 mb-3">
              <button
                onClick={repetirUltimoCardapio}
                disabled={bulkLoading}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                title="Liga os mesmos itens do último dia que você abriu"
              >
                <RotateCcw className="w-4 h-4" /> Repetir último cardápio
              </button>
              <button
                onClick={() => setVarAberto(true)}
                disabled={bulkLoading}
                className="inline-flex items-center gap-2 border border-primary/40 text-primary rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/10 disabled:opacity-50"
                title="Adicionar vários itens (bolos, mousses do dia...) de uma vez"
              >
                <Plus className="w-4 h-4" /> Adicionar vários
              </button>
              <button
                onClick={() => setBalcaoAberto(true)}
                disabled={bulkLoading}
                className="inline-flex items-center gap-2 border border-primary/40 text-primary rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/10 disabled:opacity-50"
                title="Fotografar produtos — a IA reconhece e adiciona"
              >
                <Camera className="w-4 h-4" /> Fotografar produtos
              </button>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={buscaCardapio}
                  onChange={(e) => setBuscaCardapio(e.target.value)}
                  placeholder="Buscar item..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Modelos de cardápio salvos */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <button onClick={salvarModeloAtual} disabled={bulkLoading} className="inline-flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5 hover:bg-secondary disabled:opacity-50">
                <Save className="w-4 h-4" /> Salvar como modelo
              </button>
              {modelos.map((m) => (
                <span key={m.id} className="inline-flex items-center rounded-full border border-border bg-card text-sm overflow-hidden">
                  <button onClick={() => aplicarModelo(m)} disabled={bulkLoading} className="pl-3 pr-2 py-1.5 hover:bg-primary/10 disabled:opacity-50">
                    {m.nome} <span className="text-muted-foreground text-xs">({m.itens.length})</span>
                  </button>
                  <button onClick={() => excluirModelo(m.id)} className="px-2 py-1.5 text-muted-foreground hover:text-destructive border-l border-border" title="Excluir modelo">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Filtro por categoria */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-2">
              {['Todas', ...categoriasCardapio].map((c) => (
                <button
                  key={c}
                  onClick={() => setCatCardapio(c)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    catCardapio === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Status + ações em massa */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                {(['todos', 'ligados', 'desligados'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroLigado(f)}
                    className={`px-3 py-1.5 capitalize ${filtroLigado === f ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 ml-auto">
                <button onClick={ligarVisiveis} disabled={bulkLoading} className="text-sm bg-primary/10 text-primary border border-primary/30 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50">Ligar visíveis</button>
                <button onClick={desligarVisiveis} disabled={bulkLoading} className="text-sm border border-border rounded-lg px-3 py-1.5 disabled:opacity-50">Desligar visíveis</button>
              </div>
            </div>

            {bulkLoading && (
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Processando...
              </p>
            )}

            {itensBaixos > 0 && (
              <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {itensBaixos} {itensBaixos === 1 ? 'item está acabando' : 'itens estão acabando'} — reabasteça ou desligue.
              </div>
            )}

            {itensCardapioFiltrados.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
                Nenhum item neste filtro.
              </div>
            ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {itensCardapioFiltrados.map((item) => {
                const baixo = estoqueBaixo(item)
                return (
                <div key={item.produto_id} className={`rounded-2xl border p-4 flex items-center gap-3 ${baixo ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200' : item.ligado ? 'bg-card border-border' : 'bg-muted/40 border-border'}`}>
                  <Package className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate flex items-center gap-1.5">
                      {item.nome}
                      {baixo && <span className="text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full px-1.5 py-0.5">baixo</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.categoria} · R$ {Number(item.preco).toFixed(2)}{item.unidade === 'kg' ? '/kg' : ''}{item.ligado ? ` · ${item.quantidade}${item.unidade === 'kg' ? ' kg' : ' un'}` : ' · desligado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      min={0}
                      step={item.unidade === 'kg' ? 0.1 : 1}
                      value={qtds[item.produto_id] ?? 0}
                      onChange={(e) => setQtds({ ...qtds, [item.produto_id]: Number(e.target.value) })}
                      className="w-16 border rounded-lg px-2 py-1.5 text-center bg-background"
                    />
                    <span className="text-xs text-muted-foreground">{item.unidade === 'kg' ? 'kg' : 'un'}</span>
                  </div>
                  {item.ligado ? (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => ligar(item)} className="text-xs bg-primary text-primary-foreground rounded-lg px-3 py-1.5">Salvar qtd</button>
                      <button onClick={() => desligar(item)} className="text-xs border border-border rounded-lg px-3 py-1.5">Desligar</button>
                    </div>
                  ) : (
                    <button onClick={() => ligar(item)} className="text-sm bg-primary text-primary-foreground rounded-xl px-4 py-2 font-medium">Ligar</button>
                  )}
                </div>
                )
              })}
            </div>
            )}
          </>
        )}

        {/* ---------- ABA PRODUTOS (tabela / edição em massa) ---------- */}
        {aba === 'tabela' && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <div>
                <h2 className="font-heading text-xl font-bold">Produtos</h2>
                <p className="text-sm text-muted-foreground">Tudo num lugar só: foto, nome, preço, categoria e ativo. As mudanças só vão pro banco ao salvar.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={abrirNovo} className="inline-flex items-center gap-1.5 border border-border rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary">
                  <Plus className="w-4 h-4" /> Novo produto
                </button>
                <button
                  onClick={salvarTabela}
                  disabled={bulkLoading || qtdMudados === 0}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar{qtdMudados > 0 ? ` (${qtdMudados})` : ''}
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={buscaTabela}
                  onChange={(e) => setBuscaTabela(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select value={catProduto} onChange={(e) => setCatProduto(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                {['Todas', ...CATEGORIAS].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="border border-border rounded-xl overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-secondary/60 text-muted-foreground text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Foto</th>
                    <th className="text-left px-3 py-2 font-semibold">Nome</th>
                    <th className="text-left px-3 py-2 font-semibold">Descrição</th>
                    <th className="text-left px-3 py-2 font-semibold">Categoria</th>
                    <th className="text-left px-3 py-2 font-semibold">Por</th>
                    <th className="text-right px-3 py-2 font-semibold">Preço R$</th>
                    <th className="text-center px-3 py-2 font-semibold">Ativo</th>
                    <th className="text-center px-3 py-2 font-semibold">Verificar</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaFiltrada.map((p) => (
                    <LinhaTabela key={p.id} p={p} onChange={onChangeLinha} onUpload={handleUploadLinha} onToggleVerificar={onToggleVerificar} />
                  ))}
                </tbody>
              </table>
              {tabelaFiltrada.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">Nenhum produto encontrado.</p>}
            </div>

            <p className="text-[11px] text-muted-foreground mt-2">
              {tabela.length} produtos no catálogo · desmarque <strong>Ativo</strong> pra esconder do dia a dia (sem apagar o histórico).
            </p>

            {qtdMudados > 0 && (
              <div className="sticky bottom-3 mt-4 flex justify-center pointer-events-none">
                <button
                  onClick={salvarTabela}
                  disabled={bulkLoading}
                  className="pointer-events-auto inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-semibold shadow-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar {qtdMudados} {qtdMudados === 1 ? 'alteração' : 'alterações'}
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </main>

      {/* ---------- FORM DE PRODUTO (modal) ---------- */}
      {formAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setFormAberto(false)}>
          <form
            onSubmit={salvarProduto}
            onClick={(e) => e.stopPropagation()}
            className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg">{form.id ? 'Editar produto' : 'Novo produto'}</h2>
              <button type="button" onClick={() => setFormAberto(false)} className="text-muted-foreground text-xl">✕</button>
            </div>

            {/* Foto */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center flex-shrink-0">
                {form.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.foto_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <div>
                <label className="text-sm bg-secondary rounded-lg px-3 py-2 cursor-pointer inline-block">
                  {uploadando ? 'Enviando...' : 'Escolher foto'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadando}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(f)
                    }}
                  />
                </label>
                {form.foto_url && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, foto_url: null }))} className="block text-xs text-muted-foreground underline mt-1">
                    remover foto
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Nome</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 bg-card mt-1" placeholder="Ex.: Pão Francês" />
            </div>

            {/* Vendido por */}
            <div>
              <label className="text-sm font-medium">Vendido por</label>
              <div className="flex gap-2 mt-1">
                {([['un', 'Unidade'], ['kg', 'Peso (kg)']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm({ ...form, unidade: val })}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      form.unidade === val
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-card'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 bg-card mt-1">
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-32">
                <label className="text-sm font-medium">{form.unidade === 'kg' ? 'Preço/kg' : 'Preço'} (R$)</label>
                <input type="number" step="0.01" min="0" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 bg-card mt-1" placeholder="0,00" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} className="w-full border rounded-xl px-3 py-2.5 bg-card mt-1" placeholder="Ex.: Crocante por fora, macio por dentro." />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setFormAberto(false)} className="flex-1 border border-border rounded-xl py-3 font-medium">Cancelar</button>
              <button type="submit" disabled={salvando || uploadando} className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-medium disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- ADICIONAR VÁRIOS (bolos/mousses do dia) ---------- */}
      {varAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setVarAberto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg">Adicionar vários de hoje</h2>
              <button type="button" onClick={() => setVarAberto(false)} className="text-muted-foreground text-xl">✕</button>
            </div>
            <p className="text-sm text-muted-foreground">
              Um item por linha, com o preço no fim. Ex.:<br />
              <span className="text-foreground">Bolo de chocolate - 8,00</span>
            </p>
            <textarea
              value={varTexto}
              onChange={(e) => setVarTexto(e.target.value)}
              rows={7}
              placeholder={'Bolo de chocolate - 8,00\nMousse de maracujá - 6,50\nTorta de limão - 9,00'}
              className="w-full border rounded-xl px-3 py-2.5 bg-card text-sm"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Categoria</label>
                <select value={varCat} onChange={(e) => setVarCat(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 bg-card mt-1">
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className="text-sm font-medium">Qtd. cada</label>
                <input type="number" min={0} value={varQtd} onChange={(e) => setVarQtd(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 bg-card mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Vendido por</label>
              <div className="flex gap-2 mt-1">
                {([['un', 'Unidade'], ['kg', 'Peso (kg)']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setVarUnidade(val)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${varUnidade === val ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Eles entram no cardápio de hoje na hora. Quando não vender mais, é só desativar em Produtos — não polui o catálogo.
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setVarAberto(false)} className="flex-1 border border-border rounded-xl py-3 font-medium">Cancelar</button>
              <button type="button" onClick={adicionarVariosHoje} disabled={varSalvando} className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-medium disabled:opacity-50">
                {varSalvando ? 'Adicionando...' : 'Adicionar ao cardápio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- FOTOGRAFAR PRODUTOS (IA classifica cada foto) ---------- */}
      {balcaoAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !balcaoLoading && setBalcaoAberto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-lg flex items-center gap-2"><Camera className="w-5 h-5" /> Fotografar produtos</h2>
              <button type="button" onClick={() => setBalcaoAberto(false)} className="text-muted-foreground text-xl">✕</button>
            </div>
            <p className="text-sm text-muted-foreground">
              Tire/escolha a foto de cada produto. A IA reconhece o que é e põe a foto no produto certo — se for novo, ela cadastra. Você confere antes de salvar.
            </p>

            <label className="block border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/40">
              <span className="inline-flex items-center gap-2 text-primary font-medium"><Camera className="w-5 h-5" /> Adicionar fotos</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  const fs = Array.from(e.target.files || [])
                  if (fs.length) adicionarFotos(fs)
                  e.target.value = ''
                }}
              />
            </label>

            {fotos.length > 0 && (
              <>
                <div className="max-h-72 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {fotos.map((f) => (
                    <div key={f.key} className="flex items-center gap-2.5 px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.dataUrl} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                      {f.status === 'analisando' ? (
                        <span className="flex-1 text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> reconhecendo...</span>
                      ) : f.status === 'erro' ? (
                        <input
                          value={f.nome}
                          onChange={(e) => atualizaFoto(f.key, { nome: e.target.value, status: 'ok' })}
                          placeholder="não reconheci — digite o nome"
                          className="flex-1 border border-border rounded px-2 py-1 text-sm bg-card"
                        />
                      ) : (
                        <div className="flex-1 min-w-0">
                          <input value={f.nome} onChange={(e) => atualizaFoto(f.key, { nome: e.target.value })} className="w-full border border-border rounded px-2 py-1 text-sm bg-card" />
                          <div className="flex items-center gap-1.5 mt-1">
                            <select value={f.categoria} onChange={(e) => atualizaFoto(f.key, { categoria: e.target.value })} className="border border-border rounded px-1.5 py-0.5 text-xs bg-card">
                              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${f.produto_id == null ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {f.produto_id == null ? 'novo' : 'já existe'}
                            </span>
                          </div>
                        </div>
                      )}
                      <button type="button" onClick={() => removerFoto(f.key)} className="text-muted-foreground hover:text-destructive flex-shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Qtd. cada</label>
                  <input type="number" min={0} value={balcaoQtd} onChange={(e) => setBalcaoQtd(e.target.value)} className="w-20 border rounded-lg px-2 py-1.5 bg-card text-sm" />
                </div>
                <button type="button" onClick={confirmarFotos} disabled={balcaoLoading} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold disabled:opacity-50">
                  {balcaoLoading ? 'Adicionando...' : 'Adicionar ao dia (a verificar)'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
