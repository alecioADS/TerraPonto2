# TerraPonto — Documentação Técnica

> **Do ponto ao terreno.** Aplicativo móvel de levantamento de campo: coleta de pontos pelo
> GPS do aparelho, fotos, cadastro de detalhes, mapa de satélite com desenho e medição de
> áreas (polígonos) e exportação para planilha, Google Earth e QGIS.

| | |
|---|---|
| **Disciplina** | Dispositivos Móveis — Prof. Crispim Luiz Martins |
| **Autor** | Alécio Vieira da Silva |
| **Repositório** | https://github.com/alecioADS/TerraPonto2 |
| **Versão** | 1.0.0 (versionCode Android 2) |
| **Plataforma alvo** | Android (testado em Android 16/API 37 no emulador e em aparelho real); o código é multiplataforma (React Native) |
| **Data** | Novembro de 2026 |

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Stack tecnológica](#2-stack-tecnológica)
3. [Arquitetura](#3-arquitetura)
4. [Estrutura de pastas](#4-estrutura-de-pastas)
5. [Navegação e fluxo de telas](#5-navegação-e-fluxo-de-telas)
6. [Telas — descrição detalhada](#6-telas--descrição-detalhada)
7. [Modelo de dados e persistência](#7-modelo-de-dados-e-persistência)
8. [Serviços (camada Model)](#8-serviços-camada-model)
9. [Componentes reutilizáveis](#9-componentes-reutilizáveis)
10. [Estado global (Context API)](#10-estado-global-context-api)
11. [Hooks utilizados](#11-hooks-utilizados)
12. [Mapa: motores, camadas e cache offline](#12-mapa-motores-camadas-e-cache-offline)
13. [Geodésia: fórmulas e precisão](#13-geodésia-fórmulas-e-precisão)
14. [Exportação de dados](#14-exportação-de-dados)
15. [APIs externas](#15-apis-externas)
16. [Permissões do Android](#16-permissões-do-android)
17. [Identidade visual e acessibilidade](#17-identidade-visual-e-acessibilidade)
18. [Como executar, testar e gerar o APK](#18-como-executar-testar-e-gerar-o-apk)
19. [Decisões técnicas e problemas resolvidos](#19-decisões-técnicas-e-problemas-resolvidos)
20. [Limitações conhecidas e próximos passos](#20-limitações-conhecidas-e-próximos-passos)

---

## 1. Visão geral

O TerraPonto atende quem faz levantamento de campo (topografia, agrimensura, georreferenciamento
rural, vistoria). O fluxo principal é:

1. **Coletar** – o técnico vai até o local e o app lê o GPS em tempo real, mostrando a precisão;
   um toque registra o ponto com latitude, longitude, altitude, precisão e horário.
2. **Detalhar** – na página do ponto ele informa nome, tipo (marco, divisa, vértice...),
   responsável e observações, e tira uma foto.
3. **Visualizar e medir** – no mapa de satélite vê todos os pontos e desenha polígonos (áreas)
   tocando no mapa ou usando os próprios pontos; o app calcula área (ha, m², alqueire) e perímetro.
4. **Exportar** – gera CSV (Excel), KML (Google Earth/QGIS) ou um ZIP completo com as fotos.

Tudo funciona **offline**: os dados ficam no aparelho e o mapa guarda em cache as imagens já vistas.

### Funcionalidades

| Grupo | Funcionalidades |
|---|---|
| Conta | Cadastro, login com validação, sessão persistida (não precisa logar de novo), sair |
| Pontos (CRUD) | Coleta por GPS em tempo real, semáforo de precisão, edição de detalhes, foto (câmera ou galeria), **recoleta** com deslocamento e azimute, histórico de coletas, exclusão, busca |
| Coordenadas | Chave GMS / Decimal / UTM (zona, banda, meridiano central) válida em todo o app |
| Mapa | Satélite (Esri) ou ruas (OpenStreetMap), rótulos, pontos e áreas com etiquetas, minha posição, enquadrar tudo, cache offline |
| Áreas (CRUD) | Desenho por toque, por ponto coletado ou por GPS; vértices arrastáveis; desfazer; área/perímetro ao vivo; alerta de lados cruzados; nome, cor e observações; edição de vértices; lista com total |
| Exportação | CSV de pontos, CSV de áreas (com WKT), KML com cores, ZIP com fotos e LEIA-ME; compartilhar ou salvar em pasta |
| APIs | Clima (Open-Meteo) e Fale conosco (JSONPlaceholder) |

Capturas de tela: [`docs/telas/`](telas/) e [`ENTREGA.md`](ENTREGA.md).

---

## 2. Stack tecnológica

### Linguagem e framework

| Tecnologia | Versão | Uso |
|---|---|---|
| **TypeScript** | 5.8 | Linguagem (modo `strict`), tipagem de rotas, modelos e props |
| **React** | 19.0 | Biblioteca de UI declarativa (componentes funcionais + hooks) |
| **React Native** | 0.79.6 | Renderiza componentes nativos Android/iOS a partir do React |
| **Expo SDK** | 53 | Ferramentas, módulos nativos prontos, Expo Go e *prebuild* do projeto Android |
| **Hermes** | (embutido) | Motor JavaScript otimizado para mobile |

### Bibliotecas

| Pacote | Versão | Para quê |
|---|---|---|
| `@react-navigation/native` + `native-stack` | 7.x | Navegação em pilha com telas nativas, tipada |
| `react-native-screens`, `react-native-safe-area-context` | 4.11 / 5.4 | Telas nativas e áreas seguras (notch/barras) |
| `@react-native-async-storage/async-storage` | 2.1.2 | Banco chave-valor local (usuários, pontos, áreas, preferências, sessão) |
| `expo-location` | 18.1 | GPS em tempo real (`watchPositionAsync`), permissões |
| `expo-image-picker` | 16.1 | Câmera e galeria para a foto do ponto |
| `expo-file-system` | 18.1 | Guardar fotos, gerar arquivos de exportação, salvar em pasta (SAF) |
| `expo-sharing` | 13.1 | Folha de compartilhamento do Android (WhatsApp, e-mail, Drive...) |
| `jszip` | 3.10 | Montar o ZIP de exportação em JavaScript |
| `@react-native-community/netinfo` | 11.4.1 | Detectar falta de internet (modo offline do mapa) |
| `@maplibre/maplibre-react-native` | 10.4.2 | **Motor de mapa do APK** (aberto, sem chave de API) |
| `react-native-maps` | 1.20.1 | Motor de mapa dentro do Expo Go |
| `expo-constants` | 17.1 | Saber se o app roda no Expo Go ou no APK |
| `expo-status-bar`, `expo-asset`, `expo-font`, `expo-keep-awake` | — | Infraestrutura do Expo |

### Serviços externos (todos gratuitos e sem chave)

| Serviço | Uso |
|---|---|
| Esri World Imagery | Imagens de satélite (tiles raster) |
| OpenStreetMap | Mapa de ruas (tiles raster) |
| Esri World Boundaries and Places | Rótulos de cidades sobre o satélite |
| Open-Meteo | Clima atual e previsão de 7 dias |
| JSONPlaceholder | Simulação do envio do formulário de contato |

### Ferramentas de desenvolvimento

Android Studio + emulador (Pixel, API 37), Expo Go, Node.js/npm, Gradle 8.13 com JDK 21,
`tsc --noEmit` para checagem de tipos, Git/GitHub.

---

## 3. Arquitetura

### 3.1 MVVM aplicado ao React Native

A disciplina apresentou o padrão **MVVM (Model–View–ViewModel)**. No React Native não existe uma
classe "ViewModel" como no Android/Kotlin; o papel é exercido por **hooks e Context**. O projeto
segue a separação assim:

```
┌─────────────────────────────── VIEW ───────────────────────────────┐
│  src/pages/*        Telas: só exibem estado e repassam ações       │
│  src/components/*   Componentes visuais reutilizáveis              │
└───────────────▲──────────────────────────────────┬─────────────────┘
                │ estado (data binding do React)   │ ações (onPress, onChangeText)
┌───────────────┴──────────── VIEWMODEL ───────────▼─────────────────┐
│  Hooks de estado das telas (useState/useEffect/useMemo...)         │
│  src/context/AuthContext, PreferenciasContext  (estado global)     │
│  useExportacao()  (hook personalizado do fluxo de exportação)      │
│  Validação de formulários, regras de tela, estados carregando/erro │
└───────────────▲──────────────────────────────────┬─────────────────┘
                │ dados / Promises                 │ chamadas de função
┌───────────────┴────────────── MODEL ─────────────▼─────────────────┐
│  src/services/storage.ts     usuários, pontos, fotos (CRUD)        │
│  src/services/poligonos.ts   áreas (CRUD)                          │
│  src/services/geodesia.ts    UTM, área, perímetro, distância       │
│  src/services/api.ts         Open-Meteo e JSONPlaceholder          │
│  src/services/csv.ts, kml.ts, exportacao.ts, permissoes.ts         │
└─────────────────────────────────────────────────────────────────────┘
        AsyncStorage · Sistema de arquivos · GPS · Câmera · Internet
```

- **View** (`pages`, `components`): JSX + estilos. Não acessa AsyncStorage, `fetch` nem GPS
  diretamente — sempre por funções do Model.
- **ViewModel** (hooks + contexts): guarda o estado reativo. Quando o estado muda, o React
  re-renderiza a View automaticamente — é o *data binding* descrito no slide de MVVM.
- **Model** (`services`): funções puras ou assíncronas, sem React, testáveis isoladamente.
  Ex.: `areaPoligono()` não sabe nada de telas.

### 3.2 Princípios adotados

- **Offline-first**: nenhuma funcionalidade principal depende de servidor.
- **Tipagem forte**: `strict` no TypeScript; rotas tipadas (`RootStackParamList`) impedem navegar
  com parâmetros errados.
- **Componentização**: `CampoTexto`, `Botao`, `SeletorFormato`, `MapaBase` evitam repetição.
- **Abstração do mapa**: as telas usam `MapaBase`; trocar a biblioteca de mapa não muda as telas
  (foi exatamente o que aconteceu ao migrar para MapLibre).
- **Dados por usuário**: cada conta tem seus próprios pontos e áreas (chaves com o e-mail).

### 3.3 Árvore de componentes na inicialização

```
App
└── SafeAreaProvider
    └── AuthProvider                (sessão)
        └── PreferenciasProvider    (formato de coordenada, camada do mapa)
            ├── StatusBar
            └── Routes
                └── NavigationContainer
                    └── Stack.Navigator
                        ├── (sem login)  Login · Cadastro
                        └── (logado)     Home · NovoPonto · MeusPontos · DetalhePonto ·
                                         Mapa · Areas · DetalhePoligono · Clima · Contato
```

---

## 4. Estrutura de pastas

```
TerraPonto-Login/
├── App.tsx                      # Providers + rotas
├── app.json                     # Configuração Expo: nome, ícones, pacote Android, plugins, permissões
├── package.json                 # Dependências e scripts
├── tsconfig.json                # TypeScript strict
├── scripts/
│   └── gerar-icones.js          # Recorta a logo e gera ícone, ícone adaptativo e splash
├── docs/
│   ├── DOCUMENTACAO_TECNICA.md  # Este documento
│   ├── ENTREGA.md               # Requisitos do trabalho x implementação
│   └── telas/                   # Capturas de tela
└── src/
    ├── @types/png.d.ts          # Permite importar .png no TypeScript
    ├── assets/images/           # logo, selo, icon, adaptive-icon, splash
    ├── routes/index.tsx         # Navegação (rotas públicas x privadas) e tipos das rotas
    ├── context/
    │   ├── AuthContext.tsx          # Usuário logado + sessão persistida
    │   └── PreferenciasContext.tsx  # GMS/Decimal/UTM e satélite/ruas
    ├── global/
    │   ├── colors.ts            # Paleta
    │   ├── styles.ts            # Estilos compartilhados
    │   └── formatos.ts          # Datas, GMS, números com vírgula, área, distância, semáforo
    ├── components/
    │   ├── Botao.tsx            # Botão padrão
    │   ├── CampoTexto.tsx       # Campo de formulário com rótulo e erro (forwardRef)
    │   ├── Coordenadas.tsx      # Formatação GMS/Decimal/UTM e seletor
    │   ├── Exportacao.tsx       # Hook useExportacao + menu
    │   └── mapa/
    │       ├── index.tsx        # MapaBase: escolhe o motor, banner offline, atribuição
    │       ├── tipos.ts         # Contrato comum (props, ref, URLs, utilitários)
    │       ├── MapaMapLibre.tsx # Motor do APK
    │       └── MapaGoogle.tsx   # Motor do Expo Go
    ├── services/
    │   ├── storage.ts           # Usuários, pontos e fotos
    │   ├── poligonos.ts         # Áreas
    │   ├── geodesia.ts          # Cálculos geodésicos
    │   ├── api.ts               # APIs externas
    │   ├── csv.ts               # Geração de CSV e LEIA-ME
    │   ├── kml.ts               # Geração de KML
    │   ├── exportacao.ts        # Monta e entrega arquivos (ZIP, compartilhar, salvar)
    │   └── permissoes.ts        # Pedido seguro de permissões
    └── pages/                   # Uma pasta por tela, arquivo index.tsx
        ├── login/  (index.tsx + styles.ts)
        ├── cadastro/   home/   novoPonto/   meusPontos/   detalhePonto/
        ├── mapa/   areas/   detalhePoligono/   clima/   contato/
```

Total aproximado: **37 arquivos de código, ~6.500 linhas** de TypeScript/TSX (com comentários).

---

## 5. Navegação e fluxo de telas

React Navigation com **Native Stack**. As rotas são condicionais ao usuário logado
(`src/routes/index.tsx`):

```
                    ┌──────────┐   cadastrar   ┌──────────┐
   (sem sessão) ──▶ │  Login   │ ────────────▶ │ Cadastro │
                    └────┬─────┘ ◀──────────── └──────────┘
                         │ entrar()
                         ▼
                    ┌──────────┐
                    │   Home   │───────────────────────────────┐
                    └──┬──┬──┬─┘                               │
     ┌─────────────────┘  │  └──────────────┐                  │
     ▼                    ▼                 ▼                  ▼
┌──────────┐       ┌────────────┐     ┌──────────┐   ┌────────────────┐
│NovoPonto │──────▶│DetalhePonto│◀────│MeusPontos│   │ Clima · Contato│
│(GPS)     │ salvar│(form/foto) │     │ (lista)  │   └────────────────┘
└──────────┘       └─────┬──────┘     └──────────┘
     ▲  recoletar        │ ver no mapa
     └───────────────────┤
                         ▼
┌──────────┐ desenhar ┌──────┐ tocar área ┌─────────────────┐
│  Areas   │◀────────▶│ Mapa │───────────▶│ DetalhePoligono │
│ (lista)  │─────────▶└──────┘◀───────────│ (form/medidas)  │
└──────────┘               editar vértices└─────────────────┘
```

Parâmetros relevantes: `NovoPonto {recoletarId}`, `DetalhePonto {id, novo}`,
`Mapa {focoPontoId | focoPoligonoId | editarPoligonoId | novoDesenho}`,
`DetalhePoligono {id, novo}`, `Clima {latitude, longitude, nome}`.

Ao sair da conta, `usuario` vira `null` e o navegador passa a ter só Login/Cadastro — o botão
voltar não retorna para telas privadas.

---

## 6. Telas — descrição detalhada

### 6.1 Login (`pages/login`)
Formulário de e-mail e senha. Valida formato de e-mail (regex) e senha mínima de 6 caracteres
antes de chamar `autenticar()`. Mostrar/ocultar senha, teclado "próximo" leva ao campo de senha
(`useRef`), indicador de carregamento no botão, mensagem de erro. Link para Cadastro.

### 6.2 Cadastro (`pages/cadastro`)
Formulário com nome, e-mail, senha e confirmação. Validação por campo, com o erro embaixo de cada
um (componente `CampoTexto`). E-mail duplicado é recusado pelo Model. Após criar, volta ao Login.

### 6.3 Home (`pages/home`)
Saudação com o primeiro nome, resumo (nº de pontos e de áreas, atualizado a cada vez que a tela
volta a aparecer — `useFocusEffect`) e grade com 6 atalhos gerada a partir de um array `MENU`.
"Sair da conta" pede confirmação.

### 6.4 Coletar ponto (`pages/novoPonto`)
- Pede a permissão de localização (consultando antes, ver §16) e liga o GPS com
  `watchPositionAsync` (precisão máxima, 1 leitura por segundo).
- Mostra latitude/longitude no formato escolhido, altitude, precisão e o **semáforo**:
  🟢 boa (≤ 5 m), 🟠 moderada (≤ 15 m), 🔴 baixa (> 15 m), ⚪ sem estimativa.
- "Registrar ponto aqui" grava o ponto (`criarPonto`) e abre o detalhe com aviso "ponto registrado".
  Se a precisão for pior que 15 m, pergunta se deseja aguardar.
- **Modo recoleta** (`recoletarId`): mostra a coordenada antiga, o **deslocamento** (Haversine) e o
  **azimute** até a nova posição; ao confirmar, a coleta antiga vai para o histórico.
- Se o usuário recusar o diálogo de "precisão de localização" do Google, tenta de novo sem ele.
- Ao sair da tela, o GPS é desligado (economia de bateria).

### 6.5 Meus pontos (`pages/meusPontos`)
`FlatList` com miniatura da foto, ícone do tipo, coordenada, data e precisão. Busca em tempo real,
seletor GMS/Decimal/UTM, contador "x de y pontos", estado vazio, toque longo/lixeira para excluir,
botão "Coletar novo ponto" e **Exportar** no cabeçalho.

### 6.6 Detalhe do ponto (`pages/detalhePonto`)
- Cartão com as coordenadas coletadas (não editáveis), altitude, precisão e data/hora.
- **Foto**: câmera ou galeria, recorte, cópia para a pasta permanente do app; trocar/remover.
- **Formulário**: nome (obrigatório), tipo (Marco, Divisa, Vértice, Árvore, Construção, Outro),
  responsável, observações.
- Ações: salvar, **recoletar localização**, **ver no mapa**, **ver clima no local**, excluir.
- Histórico de coletas anteriores (quando houve recoleta).
- Fotos tiradas e descartadas sem salvar são apagadas ao sair (não deixa lixo no aparelho).

### 6.7 Mapa (`pages/mapa`)
- **Modo ver**: satélite ou ruas; áreas coloridas com etiqueta (nome + área) e pontos com nome
  (nomes aparecem com zoom suficiente). Tocar numa área destaca e abre um cartão com hectares, m²,
  alqueire mineiro, perímetro e "Ver detalhes"; tocar num ponto abre o detalhe.
- Botões: 🗺️/🛰️ satélite↔ruas, 🏷️ rótulos de cidades, 🔍 enquadrar tudo, 🎯 minha posição.
- **Modo desenhar**: toque no mapa adiciona vértice; toque num ponto coletado usa a coordenada
  exata dele; "📡 Vértice GPS" usa a posição atual; vértices numerados podem ser **arrastados**;
  "Desfazer"; painel com vértices, área e perímetro **ao vivo**; aviso vermelho se os lados se
  cruzam. "Concluir" salva e abre o detalhe da área. Sair com desenho não salvo pede confirmação.
- Também é usado para **editar os vértices** de uma área existente.

### 6.8 Áreas (`pages/areas`)
Lista (`FlatList`) com cor, nome, área, perímetro, nº de vértices e observação; resumo com a soma
em hectares; estado vazio; atalhos para o Mapa e Exportar; botão "Desenhar nova área".

### 6.9 Detalhe da área (`pages/detalhePoligono`)
Prévia estática no mapa (tocar abre o mapa grande focado), medidas em **ha, m², alqueire mineiro
(48.400 m²), alqueire paulista (24.200 m²) e perímetro**, aviso se há lados cruzados, "Editar
vértices no mapa", formulário de nome, **paleta de 7 cores** e observações, datas de criação e
alteração, excluir.

### 6.10 Clima (`pages/clima`) — API
Chips de cidades (FlatList horizontal) — ou a coordenada do ponto, quando aberto a partir dele.
Mostra temperatura, descrição com ícone, umidade, vento e a previsão de 7 dias (máx./mín./chuva).
Estados de carregando, erro com "Tentar novamente" e sucesso.

### 6.11 Fale conosco (`pages/contato`) — formulário + API
Nome e e-mail pré-preenchidos com o usuário logado, assunto (Dúvida/Sugestão/Problema/Outro) e
mensagem (mín. 10 caracteres). Envia por POST e mostra o número de protocolo devolvido.

---

## 7. Modelo de dados e persistência

### 7.1 Entidades (TypeScript)

```ts
interface Usuario { nome: string; email: string; senha: string }

type TipoPonto = 'Marco' | 'Divisa' | 'Vértice' | 'Árvore' | 'Construção' | 'Outro';

interface Ponto {
  id: string;
  // capturado pelo GPS (não editável)
  latitude: number; longitude: number;
  altitude: number | null; precisao: number | null;   // metros
  coletadoEm: string;                                  // ISO 8601
  // preenchido pelo usuário
  nome: string; tipo: TipoPonto; responsavel: string; descricao: string;
  fotoUri: string | null;                              // file:// na pasta do app
  atualizadoEm: string;
  historico: ColetaAnterior[];                         // recoletas (mais recente primeiro)
}

interface ColetaAnterior { latitude; longitude; altitude; precisao; coletadoEm }

interface Poligono {
  id: string; nome: string; observacoes: string;
  cor: string;                 // '#RRGGBB'
  vertices: LatLng[];          // sem repetir o primeiro no fim
  areaM2: number; perimetroM: number;   // recalculados ao mudar vértices
  criadoEm: string; atualizadoEm: string;
}
```

### 7.2 Onde cada coisa fica

| Dado | Armazenamento | Chave / caminho |
|---|---|---|
| Usuários | AsyncStorage | `@terraponto:usuarios` |
| Sessão | AsyncStorage | `@terraponto:sessao` |
| Pontos do usuário | AsyncStorage | `@terraponto:pontos:<email>` |
| Áreas do usuário | AsyncStorage | `@terraponto:poligonos:<email>` |
| Formato de coordenada | AsyncStorage | `@terraponto:formatoCoordenada` |
| Camada do mapa | AsyncStorage | `@terraponto:camadaMapa` |
| Fotos | Sistema de arquivos | `documentDirectory/fotos/<id>.jpg` |
| Cache do mapa (APK) | Banco do MapLibre | até 300 MB |
| Cache do mapa (Expo Go) | Sistema de arquivos | `documentDirectory/mapa-cache/` |
| Arquivos exportados | Cache do app | temporários |

### 7.3 Regras de negócio no Model

- E-mail é normalizado (minúsculas, sem espaços); cadastro duplicado é recusado.
- Ao **criar** ponto: nome automático "Ponto 001", "Ponto 002"...; tipo padrão "Marco".
- Ao **recoletar**: a coleta atual entra no início de `historico` e é substituída pela nova.
- Ao **excluir** ponto: a foto também é apagada do aparelho.
- Ao trocar a foto: a foto anterior é apagada depois de salvar.
- Áreas: nome automático "Área 01"..., cor seguinte da paleta; área e perímetro recalculados
  sempre que os vértices mudam.
- `normalizar()` completa campos ausentes de pontos gravados por versões antigas do app.

---

## 8. Serviços (camada Model)

| Arquivo | Funções principais |
|---|---|
| `storage.ts` | `cadastrarUsuario`, `autenticar`, `listarPontos`, `obterPonto`, `criarPonto`, `recoletarPonto`, `atualizarPonto`, `excluirPonto`, `guardarFoto`, `excluirArquivo` |
| `poligonos.ts` | `listarPoligonos`, `obterPoligono`, `criarPoligono`, `atualizarPoligono`, `atualizarVertices`, `excluirPoligono`, `CORES_POLIGONO` |
| `geodesia.ts` | `paraUtm`, `zonaUtm`, `distanciaMetros`, `azimuteGraus`, `areaPoligono`, `perimetroPoligono`, `centroPoligono`, `temAutointersecao`, constantes de unidades agrárias |
| `api.ts` | `buscarClima`, `descreverTempo`, `enviarContato` |
| `csv.ts` | `gerarCsv`, `gerarCsvAreas`, `leiaMe`, `nomeFoto`, `isoLocal` |
| `kml.ts` | `gerarKml`, `corKml` |
| `exportacao.ts` | `gerarArquivoCsv`, `gerarArquivoKml`, `gerarArquivoZip`, `entregarArquivo` |
| `permissoes.ts` | `permissaoLocalizacao`, `permissaoCamera`, `permissaoGaleria` |

---

## 9. Componentes reutilizáveis

| Componente | Descrição |
|---|---|
| `Botao` | Primário (laranja) ou secundário (contorno), estado `carregando`, altura ≥ 52 dp |
| `CampoTexto` | `TextInput` com rótulo e mensagem de erro; usa `forwardRef` para a tela controlar o foco |
| `SeletorFormato` | Chave GMS / Decimal / UTM ligada ao `PreferenciasContext` |
| `linhasCoordenada`, `textoCoordenada` | Formatação das coordenadas para a tela |
| `useExportacao`, `BotaoExportar` | Hook + botão do fluxo de exportação (menu próprio com 3 opções) |
| `MapaBase` | Mapa independente de biblioteca: áreas, pontos, desenho, vértices arrastáveis, eventos e métodos `irPara`, `centralizar`, `enquadrar` |

---

## 10. Estado global (Context API)

- **AuthContext** — `usuario`, `carregando`, `entrar(usuario)`, `sair()`. Restaura a sessão do
  AsyncStorage ao abrir; enquanto verifica, as rotas mostram um indicador de carregamento.
- **PreferenciasContext** — `formato` (`gms`/`decimal`/`utm`) e `camadaMapa` (`satelite`/`ruas`),
  com persistência. Mudar a chave numa tela atualiza todas.

---

## 11. Hooks utilizados

| Hook | Onde | Para quê |
|---|---|---|
| `useState` | todas as telas e contexts | Estado local: campos de formulário, listas, carregando, erros |
| `useEffect` | Clima, NovoPonto, DetalhePonto, Mapa, contexts, mapa | Efeitos colaterais: buscar API quando o local muda, ligar/desligar GPS, restaurar sessão, limpar fotos, aviso ao sair |
| `useRef` | Login, Cadastro, Contato, DetalhePonto, NovoPonto, Mapa, mapa | Foco entre campos, assinatura do GPS, referência ao mapa, valores que não devem re-renderizar |
| `useContext` | `useAuth`, `usePreferencias` | Ler o estado global |
| `useCallback` | Home, MeusPontos, Areas, Detalhes, Mapa, mapa | Funções estáveis (exigido pelo `useFocusEffect` e pelo arrasto) |
| `useMemo` | Mapa, MapaMapLibre | Não recriar as camadas do mapa a cada quadro de arrasto |
| `useLayoutEffect` | MeusPontos, Areas, Mapa | Configurar botões/título do cabeçalho antes de pintar |
| `useImperativeHandle` + `forwardRef` | MapaMapLibre, MapaGoogle, CampoTexto | Expor métodos (`irPara`, `enquadrar`, `focus`) para a tela |
| `useFocusEffect` (React Navigation) | Home, MeusPontos, Areas, Detalhes, Mapa | Recarregar dados quando a tela volta a ficar visível |
| **Hooks personalizados** | `useAuth`, `usePreferencias`, `useExportacao` | Encapsular lógica reutilizável (papel de ViewModel) |

---

## 12. Mapa: motores, camadas e cache offline

### 12.1 Por que dois motores

| Ambiente | Motor | Motivo |
|---|---|---|
| **APK** (aparelho) | **MapLibre** | Aberto e **sem chave de API**. O SDK do Google Maps exige uma chave própria no APK; sem ela o mapa fica em branco |
| **Expo Go** (desenvolvimento) | react-native-maps | O Expo Go não inclui o MapLibre, mas já traz o Google Maps com a chave do Expo |

`components/mapa/index.tsx` decide com `Constants.executionEnvironment` e carrega o motor com
`require` condicional (o módulo nativo que não existe no ambiente nunca é carregado).

### 12.2 Contrato `MapaBase`

```ts
<MapaBase
  regiaoInicial={{ latitude, longitude, latitudeDelta, longitudeDelta }}
  camadaBase="satelite" | "ruas"
  areas={[{ id, vertices, cor, destaque }]}
  pontos={[{ id, latitude, longitude }]}
  desenho={{ vertices, cor }}          // polígono (3+) ou linha (2)
  verticesEditaveis={vertices}         // numerados e arrastáveis
  onToque / onToqueArea / onToquePonto / onMoverVertice / onRegiao / onPronto
/>
ref.current.irPara(coord, delta) · centralizar(coord) · enquadrar(coords, margens)
```

### 12.3 Camadas (MapLibre)

1. Fundo escuro (estilo mínimo próprio).
2. `RasterSource` satélite Esri (zoom nativo até 18, ampliado até 20).
3. `RasterSource` ruas OSM (alternado por visibilidade, sem recarregar o estilo).
4. `RasterSource` rótulos Esri (opcional).
5. `ShapeSource` áreas → `FillLayer` + `LineLayer` com cor por propriedade do GeoJSON.
6. `ShapeSource` desenho em andamento.
7. Posição do usuário (`UserLocation`).
8. `ShapeSource` pontos → `CircleLayer` (laranja com borda branca; área de toque de 40 dp).
9. `MarkerView` para cada vértice em edição (View React com `PanResponder`).

Nomes dos pontos e etiquetas das áreas são **Views comuns sobre o mapa**, posicionadas pela
projeção **Web Mercator** a partir da região visível (função `projetar` em `pages/mapa`). Isso
funciona igual nos dois motores e contorna o corte de textos em marcadores do react-native-maps.

### 12.4 Arrastar vértices

O dedo é acompanhado por um `PanResponder`; a cada movimento a posição na tela é convertida em
coordenada (inverso da Web Mercator sobre a região visível) e o vértice é atualizado — o polígono,
a área e o perímetro acompanham ao vivo. O `PanResponder` é criado uma única vez (as funções mais
recentes ficam numa `ref`), pois recriá-lo no meio do gesto perderia o arrasto.

### 12.5 Offline

- **APK**: o MapLibre guarda os tiles vistos num banco interno (limite configurado: 300 MB). Sem
  conexão (`NetInfo.isConnected === false`), `setConnected(false)` força o uso só do cache.
- **Expo Go**: `UrlTile` com `tileCachePath` (pasta do app) e validade de 30 dias; `offlineMode`
  quando não há conexão.
- Em ambos aparece o aviso "📴 Sem internet — exibindo o mapa salvo no aparelho".
- Só fica disponível offline o que já foi visto com internet (não há download de região inteira).

---

## 13. Geodésia: fórmulas e precisão

Referencial: **WGS84** (a = 6.378.137 m, f = 1/298,257223563), compatível com **SIRGAS 2000** na
precisão de GPS de celular.

### 13.1 Coordenadas UTM
Fórmulas da Transversa de Mercator de J. P. Snyder, *Map Projections – A Working Manual*, USGS
Professional Paper 1395 (1987), pp. 57-64. k₀ = 0,9996, falso leste 500.000 m, falso norte
10.000.000 m no hemisfério sul. Zona = ⌊(λ + 180)/6⌋ + 1; banda de latitude pela letra (C–X).
**Validação**: comparado com o PROJ em 6 pontos de referência — diferença < 1 mm.

### 13.2 Área do polígono
1. Vértices projetados num **plano tangente local** centrado no centroide, com os raios de curvatura
   do elipsoide naquela latitude:
   M = a(1−e²)/(1−e² sen²φ)^(3/2) (meridiano) e N = a/(1−e² sen²φ)^(1/2) (primeiro vertical);
   x = Δλ·N·cos φ₀, y = Δφ·M.
2. **Fórmula de Gauss (shoelace)**: A = ½ |Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)|.

Diferente de calcular no UTM, não carrega o fator de escala da projeção. Validado contra a fórmula
exata da zona elipsoidal: erro < 0,2 ppm para polígonos de até ~11 km de lado.

### 13.3 Outras medidas
- **Perímetro**: soma das distâncias no mesmo plano local.
- **Distância (recoleta)**: Haversine com raio médio 6.371.008,8 m (IUGG).
- **Azimute**: rumo inicial a partir do Norte, 0–360°.
- **Centroide**: centro de massa do polígono (posição da etiqueta).
- **Autointerseção**: teste de orientação entre todos os pares de lados não adjacentes.
- **Unidades agrárias**: hectare = 10.000 m²; alqueire mineiro = 48.400 m²; alqueire paulista = 24.200 m².

---

## 14. Exportação de dados

Botão **⬇️ Exportar** em *Meus pontos* e *Áreas* → menu:

| Opção | Arquivo | Conteúdo |
|---|---|---|
| 📦 Completo | `terraponto_exportacao_AAAAMMDD_HHMM.zip` | `pontos.csv`, `areas.csv`, `terraponto.kml`, `fotos/` (ex.: `P001_divisa-norte.jpg`), `LEIA-ME.txt` |
| 🌍 Google Earth | `.kml` | Pastas "Pontos" e "Áreas", nomes, descrições, cores (KML usa `aabbggrr`) |
| 📊 Pontos | `.csv` | Planilha de pontos |

Depois: **Compartilhar** (folha do Android) ou **Salvar no aparelho** (seletor de pastas — Storage
Access Framework).

**`pontos.csv`** (separador `;`, UTF-8 com BOM, para o Excel em português abrir certo):
`codigo; nome; tipo; latitude; longitude; altitude_m; precisao_m; utm_zona; utm_leste_m;
utm_norte_m; coletado_em; atualizado_em; responsavel; observacoes; foto; recoletas`

**`areas.csv`**: `codigo; nome; area_m2; area_ha; alqueire_mineiro; perimetro_m; vertices; cor;
observacoes; criado_em; atualizado_em; wkt` — a coluna `wkt` (`POLYGON((lon lat, ...))`) é
carregada direto como geometria no QGIS.

Datas em ISO 8601 com fuso local (ex.: `2026-11-22T14:40:26-03:00`). Números com ponto decimal
nos arquivos (padrão de SIG); na tela, vírgula.

---

## 15. APIs externas

### Open-Meteo (GET)
```
https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
  &current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code
  &daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code
  &timezone=auto&forecast_days=7
```
O código WMO do tempo é traduzido para texto e ícone (`descreverTempo`).

### JSONPlaceholder (POST)
`POST https://jsonplaceholder.typicode.com/posts` com `{nome, email, assunto, mensagem}`; o `id`
devolvido vira o número de protocolo. Erros de rede viram mensagem amigável.

---

## 16. Permissões do Android

| Permissão | Quando é pedida | Uso |
|---|---|---|
| `ACCESS_FINE_LOCATION` / `COARSE` | Ao abrir "Coletar ponto", "Minha posição" ou "Vértice GPS" | GPS |
| `CAMERA` | Ao tocar em "Tirar foto" | Foto do ponto |
| Galeria | Ao escolher foto da galeria (seletor de fotos do sistema) | Foto do ponto |
| `INTERNET`, `ACCESS_NETWORK_STATE` | Automáticas | Mapa, APIs, detectar offline |

**Pedido seguro** (`services/permissoes.ts`): primeiro *consulta*; só *pede* se ainda não foi
concedida. Motivo: nas versões recentes do Android, pedir uma permissão já concedida não devolve
resposta ao app ("No requestable permission in the request") e a tela ficaria travada em
"Solicitando permissão...". Se o usuário negou de vez, o app explica e oferece abrir as
configurações.

---

## 17. Identidade visual e acessibilidade

- Paleta (`global/colors.ts`): azul GNSS `#0B2A4A`, laranja marco `#FF6A00`, verde campo
  `#16A34A`, fundo `#24282E`, branco mineral `#F8FAF5`.
- Logo própria recortada e ícone adaptativo gerados por `scripts/gerar-icones.js`.
- Fonte monoespaçada nas coordenadas (alinhamento dos dígitos).
- Números no padrão brasileiro (vírgula decimal, ponto de milhar).
- Alvos de toque ≥ 44–52 dp; `accessibilityLabel`/`accessibilityRole` nos campos e botões
  principais; o semáforo de precisão usa **ícone + texto + cor** (não depende só da cor).

---

## 18. Como executar, testar e gerar o APK

### Desenvolvimento (Expo Go)
```bash
npm install
npx expo start        # ler o QR Code com o Expo Go, ou "a" para o emulador
npx tsc --noEmit      # checagem de tipos
```
No emulador, defina a posição em *Extended controls → Location* ou `adb emu geo fix <lon> <lat>`.

### APK (instalar no celular)
Requer Android SDK e **JDK 17 ou 21** (Gradle 8.13 não roda com Java 25).
```bash
npm install
npx expo prebuild --platform android --clean
cd android && JAVA_HOME=/caminho/jdk-21 ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```
O APK é assinado com a chave de depuração (adequado para testes, não para a Play Store).
O `app.json` define `newArchEnabled: false` porque o MapLibre v10 só suporta a nova arquitetura
parcialmente. **Não compile dentro de pasta sincronizada com iCloud/OneDrive.**

### Instalação no celular
Copiar o `.apk` para o aparelho, abrir e permitir "instalar apps desta fonte". Atualizações com o
mesmo pacote (`com.terraponto.app`) mantêm os dados.

### Roteiro de teste manual
1. Cadastrar conta → login → fechar e reabrir o app (continua logado).
2. Coletar ponto (GPS) → preencher detalhes → foto → salvar.
3. Alternar GMS / Decimal / UTM na lista.
4. Recoletar o ponto e conferir deslocamento/histórico.
5. Mapa: alternar satélite/ruas, desenhar área com 4 vértices, arrastar um vértice, concluir,
   nomear e trocar a cor; tocar na área no mapa.
6. Exportar ZIP → salvar → abrir o CSV no Excel e o KML no Google Earth.
7. Clima (trocar cidade; desligar internet para ver o erro) e Fale conosco (validações + protocolo).
8. Sair da conta.

---

## 19. Decisões técnicas e problemas resolvidos

| Problema | Solução |
|---|---|
| Mapa em branco no APK (Google Maps exige chave própria) | Migração para **MapLibre** com abstração `MapaBase`; Expo Go mantém o react-native-maps |
| Textos de marcadores cortados no react-native-maps (nova arquitetura) | Nomes/etiquetas desenhados como Views sobre o mapa com projeção Web Mercator |
| `PointAnnotation` do MapLibre não aparece no Android | Vértices com `MarkerView` + arrasto próprio com `PanResponder` |
| Pedido de permissão já concedida nunca respondia (Android 16) | `services/permissoes.ts`: consultar antes de pedir |
| GPS "indisponível" ao recusar o diálogo de precisão do Google | Nova tentativa com `mayShowUserSettingsDialog: false` |
| `Alert` do Android mostra no máximo 3 botões | Menu de exportação próprio (`Modal`) |
| Detecção de internet dava falso negativo em hotspot | Offline só quando `isConnected === false` |
| App fechava ao abrir no APK (`Cannot find native module 'ExpoAsset'`) | Dependências do Expo declaradas diretamente (autolinking só lê o primeiro nível do `node_modules`) |
| Login perdido ao recarregar | Sessão persistida no AsyncStorage |
| Ponto decimal em vez de vírgula | Funções `numeroBR`/`metrosBR` e GMS com vírgula |
| Gradle falhando com Java 25 | Build com JDK 21 |

---

## 20. Limitações conhecidas e próximos passos

**Limitações**
- Dados apenas no aparelho: desinstalar o app apaga tudo (use a exportação como backup).
- Senha guardada sem criptografia — aceitável para o escopo acadêmico com autenticação local.
- Precisão limitada ao GPS do celular (tipicamente 3–10 m); não substitui receptor RTK.
- Mapa offline só das regiões já visitadas com internet.
- O formulário de contato usa uma API de testes (não entrega e-mail de verdade).
- APK assinado com chave de depuração.

**Próximos passos sugeridos**
- Backend (Firebase Auth + Firestore) com sincronização e senha protegida.
- "Baixar mapa desta área" (pacotes offline do MapLibre).
- Importar KML/CSV; exportar Shapefile/GeoJSON.
- Média de várias leituras de GPS por ponto; suporte a receptor GNSS externo (Bluetooth).
- Testes automatizados (Jest para `services/`, testes de tela).
