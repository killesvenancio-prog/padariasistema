'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarQuantidade } from '@/lib/format'
import { LayoutDashboard, ClipboardList, CalendarDays, Package, Store, Lock, ImageIcon } from 'lucide-react'

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

const CATEGORIAS = ['Pães', 'Doces', 'Salgados', 'Bebidas']

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

export default function AdminPage() {
  const [carregando, setCarregando] = useState(true)
  const [logado, setLogado] = useState(false)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState<string | null>(null)

  const [aba, setAba] = useState<'resumo' | 'pedidos' | 'cardapio' | 'produtos'>('resumo')
  const [itensHoje, setItensHoje] = useState<ItemHoje[]>([])
  const [qtds, setQtds] = useState<Record<number, number>>({})
  const [produtos, setProdutos] = useState<ProdutoAdmin[]>([])
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  const [form, setForm] = useState(formVazio)
  const [formAberto, setFormAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)

  useEffect(() => {
    verificarSessao()
  }, [])

  // atualiza os pedidos sozinho enquanto a aba Pedidos está aberta
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
    if (data) setPedidos(data as PedidoAdmin[])
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

  function abrirNovo() {
    setForm(formVazio)
    setFormAberto(true)
  }

  function abrirEdicao(p: ProdutoAdmin) {
    setForm({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: String(p.preco),
      categoria: p.categoria,
      unidade: p.unidade === 'kg' ? 'kg' : 'un',
      emoji: p.emoji ?? '',
      foto_url: p.foto_url,
    })
    setFormAberto(true)
  }

  async function handleUpload(file: File) {
    setUploadando(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `produto-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('produtos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
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
      ? await supabase.from('produtos').update(payload).eq('id', form.id)
      : await supabase.from('produtos').insert(payload)
    setSalvando(false)
    if (res.error) {
      setMsg('Erro ao salvar: ' + res.error.message)
      return
    }
    setMsg(form.id ? 'Produto atualizado' : 'Produto criado')
    setFormAberto(false)
    await carregarProdutos()
    await carregarItens()
  }

  async function alternarAtivo(p: ProdutoAdmin) {
    const { error } = await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id)
    setMsg(error ? `Erro: ${error.message}` : p.ativo ? `${p.nome} desativado` : `${p.nome} reativado`)
    await carregarProdutos()
    await carregarItens()
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
          {([['resumo', 'Resumo', LayoutDashboard], ['pedidos', 'Pedidos', ClipboardList], ['cardapio', 'Cardápio de Hoje', CalendarDays], ['produtos', 'Produtos', Package]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left whitespace-nowrap transition-colors ${
                aba === id ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
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
            <button onClick={() => setMsg(null)} className="text-muted-foreground">✕</button>
          </div>
        )}

        {/* ---------- ABA RESUMO ---------- */}
        {aba === 'resumo' && (
          <>
            <h2 className="font-heading text-2xl font-bold">Resumo de hoje</h2>
            <p className="text-sm text-muted-foreground mb-5 capitalize">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

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
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Pedidos recebidos · atualiza sozinho</p>
              <button onClick={carregarPedidos} className="text-sm border border-border rounded-lg px-3 py-1.5">↻ Atualizar</button>
            </div>
            {pedidos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                Nenhum pedido ainda. Os pedidos do cliente aparecem aqui na hora.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pedidos.map((pd) => (
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
            <p className="text-sm text-muted-foreground mb-4">
              Ligue o que tem hoje e ajuste a quantidade. O que está desligado não aparece pro cliente.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {itensHoje.map((item) => (
                <div key={item.produto_id} className={`rounded-2xl border p-4 flex items-center gap-3 ${item.ligado ? 'bg-card border-border' : 'bg-muted/40 border-border'}`}>
                  <Package className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.nome}</p>
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
              ))}
            </div>
          </>
        )}

        {/* ---------- ABA PRODUTOS ---------- */}
        {aba === 'produtos' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Catálogo da padaria (cadastra uma vez).</p>
              <button onClick={abrirNovo} className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">+ Novo produto</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {produtos.map((p) => (
                <div key={p.id} className={`rounded-2xl border border-border p-3 flex items-center gap-3 ${p.ativo ? 'bg-card' : 'bg-muted/40 opacity-70'}`}>
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center flex-shrink-0">
                    {p.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.nome} {!p.ativo && <span className="text-xs text-muted-foreground">(inativo)</span>}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria} · R$ {Number(p.preco).toFixed(2)}{p.unidade === 'kg' ? '/kg · por peso' : ' · por unidade'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => abrirEdicao(p)} className="text-xs bg-primary text-primary-foreground rounded-lg px-3 py-1.5">Editar</button>
                    <button onClick={() => alternarAtivo(p)} className="text-xs border border-border rounded-lg px-3 py-1.5">{p.ativo ? 'Desativar' : 'Reativar'}</button>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}
