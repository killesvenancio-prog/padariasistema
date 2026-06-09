'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/contexts/CartContext'
import { formatarPreco } from '@/lib/format'
import type { Produto } from '@/types'
import { CategorySection } from './CategorySection'
import { ProductCard } from './ProductCard'
import { CartButton } from './CartButton'
import { ChatWidget } from './ChatWidget'
import { ChatPanel } from './ChatPanel'
import { BackToTop } from './BackToTop'
import { slugCategoria, iconeCategoria } from '@/lib/categorias'
import { MapPin, Clock, Camera, Store, Bot, AlertCircle, PackageOpen, Croissant, Heart, ShoppingBag, Search, X, ClipboardList, SearchX, Lock } from 'lucide-react'

const categoriasOrdem = ['Pães', 'Confeitaria', 'Doces', 'Doces coloniais', 'Chocolates', 'Salgados', 'Salgadinhos', 'Congelados', 'Mercearia', 'Bebidas', 'Vinhos', 'Cigarros']

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function calcularAberto(): boolean {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const dia = agora.getDay() // 0 = domingo
  const min = agora.getHours() * 60 + agora.getMinutes()
  if (dia === 0) return false // Domingo: fechado
  if (dia >= 1 && dia <= 5) return min >= 390 && min <= 1170 // Seg–Sex 6h30–19h30
  return (min >= 390 && min <= 660) || (min >= 900 && min <= 1170) // Sábado 6h30–11h e 15h–19h30
}

function SkeletonList() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-3.5 flex gap-3.5 animate-pulse">
          <div className="w-24 h-24 rounded-xl bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-6 bg-muted rounded w-1/3 mt-2" />
            <div className="h-9 bg-muted rounded-xl w-28 mt-1" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MenuPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoje, setHoje] = useState('')
  const [aberto, setAberto] = useState<boolean | null>(null)
  const [logoOk, setLogoOk] = useState(true)
  const [activeCat, setActiveCat] = useState('')
  const [busca, setBusca] = useState('')
  const { totalItens, totalValor, temItensPesados } = useCart()

  useEffect(() => {
    const d = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    setHoje(d.charAt(0).toUpperCase() + d.slice(1))
    setAberto(calcularAberto())
    async function fetchCardapio() {
      try {
        const { data, error: rpcError } = await supabase.rpc('cardapio_do_dia')
        if (rpcError) throw rpcError
        let lista: Produto[] = data || []
        // Marca os itens "a verificar disponibilidade" (aditivo; ignora se a função ainda não existir)
        try {
          const { data: av } = await supabase.rpc('itens_a_verificar')
          if (Array.isArray(av)) {
            const set = new Set(av as number[])
            lista = lista.map((p) => ({ ...p, a_verificar: set.has(p.produto_id) }))
          }
        } catch {
          /* função ainda não publicada */
        }
        setProdutos(lista)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar cardápio')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCardapio()
  }, [])

  const produtosPorCategoria = categoriasOrdem.reduce((acc, categoria) => {
    acc[categoria] = produtos.filter((p) => p.categoria === categoria)
    return acc
  }, {} as Record<string, Produto[]>)

  const outrasCategoriasSet = new Set(produtos.map((p) => p.categoria))
  categoriasOrdem.forEach((c) => outrasCategoriasSet.delete(c))
  const outrasCategorias = Array.from(outrasCategoriasSet)
  outrasCategorias.forEach((categoria) => {
    produtosPorCategoria[categoria] = produtos.filter((p) => p.categoria === categoria)
  })

  const categoriasComItens = [...categoriasOrdem, ...outrasCategorias].filter(
    (c) => (produtosPorCategoria[c] || []).length > 0,
  )

  // Busca (sem acento/caixa) por nome, descrição ou categoria
  const buscaNorm = normalizar(busca.trim())
  const produtosFiltrados = buscaNorm
    ? produtos.filter((p) => normalizar(`${p.nome} ${p.descricao ?? ''} ${p.categoria}`).includes(buscaNorm))
    : []

  // Scroll-spy: destaca a categoria visível na barra fixa
  useEffect(() => {
    if (produtos.length === 0 || buscaNorm) return
    const secs = Array.from(document.querySelectorAll<HTMLElement>('section[data-cat]'))
    if (secs.length === 0) return
    setActiveCat(secs[0].id)
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActiveCat(vis[0].target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )
    secs.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [produtos, buscaNorm])

  const temMenu = !isLoading && !error && produtos.length > 0

  const conteudoMenu = isLoading ? (
    <SkeletonList />
  ) : error ? (
    <div className="text-center py-20">
      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive" />
      <p className="text-destructive font-medium mb-2">Ops! Algo deu errado</p>
      <p className="text-muted-foreground text-sm">{error}</p>
      <button onClick={() => window.location.reload()} className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
        Tentar novamente
      </button>
    </div>
  ) : produtos.length === 0 ? (
    <div className="text-center py-20">
      <PackageOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-foreground font-medium">O cardápio de hoje ainda não foi aberto</p>
      <p className="text-muted-foreground text-sm mt-1">Volte daqui a pouco!</p>
    </div>
  ) : buscaNorm ? (
    produtosFiltrados.length === 0 ? (
      <div className="text-center py-16">
        <SearchX className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-foreground font-medium">Nada encontrado para “{busca}”.</p>
        <p className="text-muted-foreground text-sm mt-1">Tente outro nome ou veja o cardápio completo.</p>
        <button onClick={() => setBusca('')} className="mt-4 inline-flex items-center gap-1.5 text-primary font-medium">
          <X className="w-4 h-4" /> Limpar busca
        </button>
      </div>
    ) : (
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Resultados</h2>
          <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">{produtosFiltrados.length}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {produtosFiltrados.map((produto) => (
            <ProductCard key={produto.produto_id} produto={produto} />
          ))}
        </div>
      </section>
    )
  ) : (
    categoriasComItens.map((categoria) => (
      <CategorySection key={categoria} id={slugCategoria(categoria)} categoria={categoria} produtos={produtosPorCategoria[categoria] || []} />
    ))
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Herói (quadro-negro com profundidade) */}
      <header className="hero-chalk text-white border-b-4 border-accent/60">
        <div className="max-w-7xl mx-auto px-5 py-6 lg:py-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Marca */}
          <div className="flex items-center gap-4">
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="Padaria Santa Cecília" onError={() => setLogoOk(false)} className="h-16 w-16 rounded-2xl bg-white object-contain p-2 flex-shrink-0 shadow-lg ring-1 ring-white/15" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 ring-1 ring-white/15"><Store className="w-8 h-8" /></div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.26em] text-accent mb-1.5 flex items-center gap-1.5">
                <Croissant className="w-3.5 h-3.5" /> Padaria &amp; Confeitaria
              </p>
              <h1 className="font-heading text-[2rem] lg:text-[2.5rem] font-bold leading-[0.95] tracking-tight">Padaria Santa Cecília</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[12.5px]">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${aberto ? 'bg-green-500/15 text-green-300 border-green-400/30' : 'bg-white/10 text-white/70 border-white/15'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${aberto ? 'bg-green-400' : 'bg-white/50'}`} />
                  {aberto === null ? 'Cardápio do dia' : aberto ? 'Aberto agora' : 'Fechado agora'}
                </span>
                {hoje && <span className="text-white/60">{hoje}</span>}
              </div>
            </div>
          </div>

          {/* Informações da loja (texto limpo, sem balão) */}
          <div className="flex flex-col gap-2 text-[13px] text-white/80 lg:max-w-xs">
            <span className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent" />
              <span>
                Marechal Floriano Peixoto, 226 — Cidade Alta
                <a href="https://www.google.com/maps/search/?api=1&query=Padaria+Santa+Cecilia+Marechal+Floriano+Peixoto+226+Santo+Antonio+da+Patrulha" target="_blank" rel="noreferrer" className="underline text-white/60 hover:text-white ml-1">ver no mapa</a>
              </span>
            </span>
            <span className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent" />
              <span>Seg–Sex 6h30–19h30 · Sáb 6h30–11h e 15h–19h30 · Dom fechado</span>
            </span>
            <Link href="/pedidos" className="flex items-center gap-2.5 hover:text-white transition w-fit">
              <ClipboardList className="w-4 h-4 flex-shrink-0 text-accent" />
              <span className="underline">Meus pedidos</span>
            </Link>
            <a href="https://www.instagram.com/santaceciliapadaria/" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-white transition w-fit">
              <Camera className="w-4 h-4 flex-shrink-0 text-accent" />
              <span className="underline">@santaceciliapadaria</span>
            </a>
          </div>
        </div>
      </header>

      {/* Barra de busca + categorias (fixa) */}
      {temMenu && (
        <nav className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
          <div className="max-w-7xl mx-auto px-3 flex items-center gap-2.5 py-2.5">
            {/* Busca */}
            <div className="relative flex-shrink-0 w-36 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar no cardápio"
                className="w-full pl-9 pr-8 py-2 rounded-full border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categorias (somem durante a busca) */}
            {!buscaNorm ? (
              <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
                {categoriasComItens.map((cat) => {
                  const id = slugCategoria(cat)
                  const Icon = iconeCategoria(cat)
                  const ativo = activeCat === id
                  return (
                    <a
                      key={cat}
                      href={`#${id}`}
                      onClick={() => setActiveCat(id)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                        ativo ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-foreground border-border hover:border-primary/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {cat}
                      <span className={`text-xs ${ativo ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{produtosPorCategoria[cat].length}</span>
                    </a>
                  )
                })}
              </div>
            ) : (
              <span className="flex-1 text-sm text-muted-foreground truncate">
                {produtosFiltrados.length} resultado{produtosFiltrados.length === 1 ? '' : 's'} para “{busca}”
              </span>
            )}

            {totalItens > 0 && (
              <Link
                href="/carrinho"
                className="hidden lg:inline-flex shrink-0 items-center gap-2 bg-primary text-primary-foreground rounded-full pl-4 pr-3 py-2 text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" /> Ver pedido
                <span className="bg-white/25 rounded-full px-2 py-0.5 text-xs font-bold">{totalItens}</span>
                <span className="tabular-nums">{formatarPreco(totalValor)}{temItensPesados && '+'}</span>
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Conteúdo: cardápio + atendente (lateral no desktop) */}
      <div className="flex-1 w-full max-w-7xl mx-auto lg:flex lg:gap-6 lg:px-4 lg:py-6">
        <main className="flex-1 min-w-0 px-4 py-6 pb-28 lg:p-0 lg:pb-6">{conteudoMenu}</main>

        <aside className="hidden lg:flex lg:flex-col w-[380px] shrink-0 self-start sticky top-[4.75rem] h-[calc(100vh-5.75rem)] bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-secondary/50">
            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Atendente da Padaria</h3>
            <p className="text-xs text-muted-foreground">Recomenda, monta e fecha seu pedido</p>
          </div>
          <ChatPanel produtos={produtos} />
        </aside>
      </div>

      {/* Rodapé */}
      <footer className="hero-chalk text-white/80 mt-2">
        <div className="max-w-7xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="font-heading text-white text-lg font-bold flex items-center gap-2"><Croissant className="w-5 h-5 text-accent" /> Padaria Santa Cecília</h3>
            <p className="text-sm mt-2 leading-relaxed text-white/70">Pães fresquinhos, doces, salgados quentinhos e bebidas — feitos com carinho todos os dias em Santo Antônio da Patrulha.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Onde estamos</h4>
            <p className="flex items-start gap-2 text-sm text-white/75"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent" /> Marechal Floriano Peixoto, 226 — Cidade Alta, Santo Antônio da Patrulha/RS</p>
            <a href="https://www.google.com/maps/search/?api=1&query=Padaria+Santa+Cecilia+Marechal+Floriano+Peixoto+226+Santo+Antonio+da+Patrulha" target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm underline text-white/70 hover:text-white">Ver no mapa</a>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Horário &amp; contato</h4>
            <p className="flex items-start gap-2 text-sm text-white/75"><Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent" /> Seg–Sex 6h30–19h30 · Sáb 6h30–11h e 15h–19h30 · Domingo fechado</p>
            <Link href="/pedidos" className="flex items-center gap-2 mt-2 text-sm underline text-white/70 hover:text-white"><ClipboardList className="w-4 h-4 text-accent" /> Meus pedidos</Link>
            <a href="https://www.instagram.com/santaceciliapadaria/" target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 text-sm underline text-white/70 hover:text-white"><Camera className="w-4 h-4 text-accent" /> @santaceciliapadaria</a>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-5 py-4 text-[12px] text-white/55 flex flex-col sm:flex-row gap-1.5 sm:items-center sm:justify-between">
            <span>© 2026 Padaria Santa Cecília</span>
            <span className="flex items-center gap-1.5">Feito com <Heart className="w-3.5 h-3.5 fill-current text-accent" /> e fermento natural</span>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white transition-colors">
              <Lock className="w-3 h-3" /> Painel do dono
            </Link>
          </div>
        </div>
      </footer>

      <CartButton />
      <ChatWidget produtos={produtos} />
      <BackToTop />
    </div>
  )
}
