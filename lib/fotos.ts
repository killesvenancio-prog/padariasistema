// Fotos de banco (provisórias) por nome de produto.
// Se o produto tiver foto_url no banco, ela tem prioridade.
const STOCK: Record<string, string> = {
  // Pães
  'Pão Francês': '/produtos/pao-frances.jpg?v=2',
  'Pão de Queijo': '/produtos/pao-de-queijo.jpg?v=2',
  'Pão Caseiro': '/produtos/pao-caseiro.jpg?v=2',
  'Pão Batido': '/produtos/pao-caseiro.jpg?v=2',
  'Pão Cervejinha': '/produtos/pao-caseiro.jpg?v=2',
  Baguete: '/produtos/baguete.jpg?v=2',
  // Doces
  'Sonho de Creme': '/produtos/sonho.jpg?v=2',
  'Bolo de Cenoura': '/produtos/bolo-cenoura.jpg?v=2',
  Cuca: '/produtos/cuca.jpg?v=2',
  // Salgados
  Coxinha: '/produtos/coxinha.jpg?v=2',
  'Coxinha Pequena': '/produtos/coxinha.jpg?v=2',
  'Pastel Assado': '/produtos/pastel.jpg?v=2',
  'Pastel de Massa Caseira': '/produtos/pastel.jpg?v=2',
  'Croquete de Carne': '/produtos/croquete.jpg?v=2',
  'Croquete de Frango': '/produtos/croquete.jpg?v=2',
  'Sanduíche Natural': '/produtos/sanduiche.jpg?v=2',
  'Batata Doce Assada': '/produtos/batata-doce.jpg?v=2',
  'Salgadinho de Pacote': '/produtos/salgadinho.jpg?v=2',
  // Bebidas
  'Café Coado': '/produtos/cafe.jpg?v=2',
  'Café Preto': '/produtos/cafe.jpg?v=2',
  'Café com Leite': '/produtos/cafe.jpg?v=2',
  'Coca-Cola Lata': '/produtos/coca.jpg?v=2',
  'Coca-Cola 2L': '/produtos/coca.jpg?v=2',
  'Guaraná Lata': '/produtos/guarana.jpg?v=2',
  'Guaraná 2L': '/produtos/guarana.jpg?v=2',
  'Pepsi Lata': '/produtos/pepsi.jpg?v=2',
  'Pepsi 2L': '/produtos/pepsi.jpg?v=2',
  'Fanta Lata': '/produtos/fanta.jpg?v=2',
  'Fanta 2L': '/produtos/fanta.jpg?v=2',
  'Sprite Lata': '/produtos/sprite.jpg?v=2',
  'Sprite 2L': '/produtos/sprite.jpg?v=2',
  // Itens novos — fotos de bancos de imagem livre (Openverse: cc0/by/by-sa).
  // Créditos em /creditos-fotos.txt. Troque por foto real no admin quando quiser.
  'Croissant': '/produtos/ov-croissant.jpg',
  'Risole': '/produtos/ov-risole.jpg',
  'Pastel Frito': '/produtos/ov-pastel.jpg',
  'Esfiha de Gergelim': '/produtos/ov-esfiha.jpg',
  'Quibe': '/produtos/ov-quibe.jpg',
  'Cachorro-quente': '/produtos/ov-cachorro-quente.jpg',
  'Bauru': '/produtos/ov-bauru.jpg',
  'Pão de Passas': '/produtos/ov-pao-passas.jpg',
  'Pão Integral Fatiado': '/produtos/ov-pao-integral.jpg',
  'Chipa (Rosquinha de Queijo)': '/produtos/ov-chipa.jpg',
  'Sorvete a Granel': '/produtos/ov-sorvete.jpg',
  'Torta / Bolo Fatiado': '/produtos/ov-torta-fatia.jpg',
  'Pavê / Sobremesa no Pote': '/produtos/ov-pave.jpg',
  'Bolo com Chantilly': '/produtos/ov-bolo-chantilly.jpg',
  'Suco de Uva Integral Dallarosa': '/produtos/ov-suco-uva.jpg',
  'Pizza LeBon Calabresa': '/produtos/ov-pizza.jpg',
  'Pizza LeBon Frango com Requeijão': '/produtos/ov-pizza.jpg',
  'Pizza LeBon Lombo com Requeijão': '/produtos/ov-pizza.jpg',
  'Pizza Seara Gourmet Margherita': '/produtos/ov-pizza.jpg',
}

export function fotoDe(p: { nome: string; foto_url: string | null }): string | null {
  return p.foto_url || STOCK[p.nome] || null
}
