// Integrações com APIs externas (gratuitas e sem chave)

export interface ClimaAtual {
  temperatura: number;
  umidade: number;
  vento: number;
  codigo: number;
}

export interface PrevisaoDia {
  data: string;
  maxima: number;
  minima: number;
  chuva: number;
  codigo: number;
}

export interface RespostaClima {
  atual: ClimaAtual;
  dias: PrevisaoDia[];
}

// API 1: Open-Meteo (previsão do tempo) - https://open-meteo.com
export async function buscarClima(latitude: number, longitude: number): Promise<RespostaClima> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code' +
    '&timezone=auto&forecast_days=7';

  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao consultar o clima.`);
  }

  const dados = await resposta.json();

  return {
    atual: {
      temperatura: dados.current.temperature_2m,
      umidade: dados.current.relative_humidity_2m,
      vento: dados.current.wind_speed_10m,
      codigo: dados.current.weather_code,
    },
    dias: (dados.daily.time as string[]).map((data, i) => ({
      data,
      maxima: dados.daily.temperature_2m_max[i],
      minima: dados.daily.temperature_2m_min[i],
      chuva: dados.daily.precipitation_probability_max[i] ?? 0,
      codigo: dados.daily.weather_code[i],
    })),
  };
}

// Traduz o código WMO do Open-Meteo para texto + emoji
export function descreverTempo(codigo: number): { texto: string; icone: string } {
  if (codigo === 0) return { texto: 'Céu limpo', icone: '☀️' };
  if (codigo <= 2) return { texto: 'Poucas nuvens', icone: '🌤️' };
  if (codigo === 3) return { texto: 'Nublado', icone: '☁️' };
  if (codigo <= 48) return { texto: 'Neblina', icone: '🌫️' };
  if (codigo <= 57) return { texto: 'Garoa', icone: '🌦️' };
  if (codigo <= 67) return { texto: 'Chuva', icone: '🌧️' };
  if (codigo <= 77) return { texto: 'Neve', icone: '❄️' };
  if (codigo <= 82) return { texto: 'Pancadas de chuva', icone: '🌧️' };
  return { texto: 'Tempestade', icone: '⛈️' };
}

// API 2: JSONPlaceholder (simula o envio do formulário de contato)
export async function enviarContato(dados: {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
}): Promise<number> {
  const resposta = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(dados),
  });

  if (!resposta.ok) {
    throw new Error('Não foi possível enviar sua mensagem.');
  }

  const json = await resposta.json();
  return json.id as number; // protocolo devolvido pelo servidor
}
