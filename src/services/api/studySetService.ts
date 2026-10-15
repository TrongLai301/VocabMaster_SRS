import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { Folder, StudySet, Card } from '@/types/database.types';
import { ParsedCardItem } from '@/services/parser/tsvParser';

// Khởi tạo sample data ban đầu nếu dùng local storage
const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'folder-ielts-core',
    user_id: 'local-user',
    name: 'IELTS Academic Vocabulary',
    description: 'Từ vựng học thuật trọng tâm cho IELTS Band 7.0+',
    color_code: '#3B82F6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'folder-business',
    user_id: 'local-user',
    name: 'Business English & Tech',
    description: 'Tiếng Anh thương mại và thuật ngữ công nghệ thông tin',
    color_code: '#10B981',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_SETS: StudySet[] = [
  {
    id: 'set-ielts-band-7',
    user_id: 'local-user',
    folder_id: 'folder-ielts-core',
    title: '50 Từ Vựng Cốt Lõi Academic Band 7.5+',
    description: 'Bộ thẻ tham khảo phong cách OpenQuiz với đầy đủ IPA, ngữ cảnh và từ đồng nghĩa',
    is_public: true,
    tags: ['IELTS', 'Academic', 'Writing Task 2'],
    total_cards: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_CARDS: Card[] = [
  {
    id: 'card-1',
    set_id: 'set-ielts-band-7',
    term: 'ubiquitous',
    ipa: '/juːˈbɪk.wə.t̬əs/',
    part_of_speech: 'adjective',
    definition: 'Present, appearing, or found everywhere at the same time.',
    example: 'Smartphones have become ubiquitous in daily modern life.',
    synonyms: ['omnipresent', 'pervasive', 'universal'],
    audio_url: null,
    image_url: null,
    order_index: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-2',
    set_id: 'set-ielts-band-7',
    term: 'ephemeral',
    ipa: '/ɪˈfem.ər.əl/',
    part_of_speech: 'adjective',
    definition: 'Lasting for a very short time; short-lived.',
    example: 'Fame in the digital age can be remarkably ephemeral.',
    synonyms: ['transient', 'fleeting', 'momentary'],
    audio_url: null,
    image_url: null,
    order_index: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-3',
    set_id: 'set-ielts-band-7',
    term: 'meticulous',
    ipa: '/məˈtɪk.jə.ləs/',
    part_of_speech: 'adjective',
    definition: 'Showing great attention to detail; very careful and precise.',
    example: 'He kept meticulous records of all his financial transactions.',
    synonyms: ['thorough', 'conscientious', 'painstaking'],
    audio_url: null,
    image_url: null,
    order_index: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-4',
    set_id: 'set-ielts-band-7',
    term: 'resilience',
    ipa: '/rɪˈzɪl.jəns/',
    part_of_speech: 'noun',
    definition: 'The capacity to withstand or recover quickly from difficulties.',
    example: 'The economic resilience of the community surprised analysts.',
    synonyms: ['toughness', 'adaptability', 'endurance'],
    audio_url: null,
    image_url: null,
    order_index: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-5',
    set_id: 'set-ielts-band-7',
    term: 'pragmatic',
    ipa: '/præɡˈmæt̬.ɪk/',
    part_of_speech: 'adjective',
    definition: 'Dealing with things sensibly and realistically in a practical way.',
    example: "She took a pragmatic approach to solving the team's dispute.",
    synonyms: ['practical', 'realistic', 'sensible'],
    audio_url: null,
    image_url: null,
    order_index: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper lưu/đọc LocalStorage
function getLocal<T>(key: string, initial: T): T {
  const data = localStorage.getItem(`vocabmaster_${key}`);
  if (!data) {
    localStorage.setItem(`vocabmaster_${key}`, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return initial;
  }
}

function setLocal<T>(key: string, data: T) {
  localStorage.setItem(`vocabmaster_${key}`, JSON.stringify(data));
}

// ==========================================
// 1. FOLDERS SERVICE
// ==========================================
export async function getFolders(): Promise<Folder[]> {
  if (!isSupabaseConfigured) {
    return getLocal<Folder[]>('folders', INITIAL_FOLDERS);
  }

  const { data, error } = await supabase.from('folders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Folder[];
}

export async function createFolder(params: { name: string; description?: string; color_code?: string }): Promise<Folder> {
  if (!isSupabaseConfigured) {
    const folders = getLocal<Folder[]>('folders', INITIAL_FOLDERS);
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      user_id: 'local-user',
      name: params.name,
      description: params.description || null,
      color_code: params.color_code || '#3B82F6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    folders.unshift(newFolder);
    setLocal('folders', folders);
    return newFolder;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Yêu cầu đăng nhập');

  const { data, error } = await supabase.from('folders').insert({
    user_id: user.id,
    name: params.name,
    description: params.description,
    color_code: params.color_code || '#3B82F6',
  }).select().single();

  if (error) throw error;
  return data as Folder;
}

// ==========================================
// 2. STUDY SETS SERVICE
// ==========================================
export async function getStudySets(folderId?: string): Promise<StudySet[]> {
  if (!isSupabaseConfigured) {
    const sets = getLocal<StudySet[]>('sets', INITIAL_SETS);
    if (folderId) return sets.filter((s) => s.folder_id === folderId);
    return sets;
  }

  let query = supabase.from('study_sets').select('*').order('created_at', { ascending: false });
  if (folderId) query = query.eq('folder_id', folderId);

  const { data, error } = await query;
  if (error) throw error;
  return data as StudySet[];
}

export async function getStudySetById(setId: string): Promise<StudySet | null> {
  if (!isSupabaseConfigured) {
    const sets = getLocal<StudySet[]>('sets', INITIAL_SETS);
    return sets.find((s) => s.id === setId) || null;
  }

  const { data, error } = await supabase.from('study_sets').select('*').eq('id', setId).single();
  if (error) return null;
  return data as StudySet;
}

export async function createStudySet(params: {
  title: string;
  description?: string;
  folder_id?: string | null;
  tags?: string[];
  is_public?: boolean;
}): Promise<StudySet> {
  if (!isSupabaseConfigured) {
    const sets = getLocal<StudySet[]>('sets', INITIAL_SETS);
    const newSet: StudySet = {
      id: `set-${Date.now()}`,
      user_id: 'local-user',
      folder_id: params.folder_id || null,
      title: params.title,
      description: params.description || null,
      is_public: params.is_public ?? true,
      tags: params.tags || [],
      total_cards: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    sets.unshift(newSet);
    setLocal('sets', sets);
    return newSet;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Yêu cầu đăng nhập');

  const { data, error } = await supabase.from('study_sets').insert({
    user_id: user.id,
    folder_id: params.folder_id || null,
    title: params.title,
    description: params.description,
    is_public: params.is_public ?? true,
    tags: params.tags || [],
  }).select().single();

  if (error) throw error;
  return data as StudySet;
}

// ==========================================
// 3. CARDS SERVICE
// ==========================================
export async function getCardsBySetId(setId: string): Promise<Card[]> {
  if (!isSupabaseConfigured) {
    const cards = getLocal<Card[]>('cards', INITIAL_CARDS);
    return cards.filter((c) => c.set_id === setId).sort((a, b) => a.order_index - b.order_index);
  }

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', setId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data as Card[];
}

export async function createCard(setId: string, item: Omit<Card, 'id' | 'set_id' | 'created_at' | 'updated_at'>): Promise<Card> {
  if (!isSupabaseConfigured) {
    const cards = getLocal<Card[]>('cards', INITIAL_CARDS);
    const newCard: Card = {
      ...item,
      id: `card-${Date.now()}`,
      set_id: setId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    cards.push(newCard);
    setLocal('cards', cards);

    // Cập nhật count
    const sets = getLocal<StudySet[]>('sets', INITIAL_SETS);
    const targetSet = sets.find((s) => s.id === setId);
    if (targetSet) {
      targetSet.total_cards = cards.filter((c) => c.set_id === setId).length;
      setLocal('sets', sets);
    }
    return newCard;
  }

  const { data, error } = await supabase.from('cards').insert({
    set_id: setId,
    term: item.term,
    ipa: item.ipa,
    part_of_speech: item.part_of_speech,
    definition: item.definition,
    example: item.example,
    synonyms: item.synonyms,
    order_index: item.order_index,
  }).select().single();

  if (error) throw error;
  return data as Card;
}

export async function deleteCard(cardId: string, setId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const cards = getLocal<Card[]>('cards', INITIAL_CARDS).filter((c) => c.id !== cardId);
    setLocal('cards', cards);

    const sets = getLocal<StudySet[]>('sets', INITIAL_SETS);
    const targetSet = sets.find((s) => s.id === setId);
    if (targetSet) {
      targetSet.total_cards = cards.filter((c) => c.set_id === setId).length;
      setLocal('sets', sets);
    }
    return;
  }

  const { error } = await supabase.from('cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function updateCard(
  cardId: string,
  updates: Partial<Omit<Card, 'id' | 'set_id' | 'created_at'>>
): Promise<Card> {
  if (!isSupabaseConfigured) {
    const cards = getLocal<Card[]>('cards', INITIAL_CARDS);
    const index = cards.findIndex((c) => c.id === cardId);
    if (index === -1) throw new Error('Không tìm thấy thẻ từ vựng');

    const updatedCard: Card = {
      ...cards[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    cards[index] = updatedCard;
    setLocal('cards', cards);
    return updatedCard;
  }

  const { data, error } = await supabase
    .from('cards')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .select()
    .single();

  if (error) throw error;
  return data as Card;
}

export async function bulkInsertCards(setId: string, items: ParsedCardItem[]): Promise<number> {
  const validItems = items.filter((item) => item.isValid);
  if (validItems.length === 0) return 0;

  if (!isSupabaseConfigured) {
    const cards = getLocal<Card[]>('cards', INITIAL_CARDS);
    const startIndex = cards.filter((c) => c.set_id === setId).length;

    const newCards: Card[] = validItems.map((item, idx) => ({
      id: `card-${Date.now()}-${idx}`,
      set_id: setId,
      term: item.term,
      ipa: item.ipa,
      part_of_speech: item.partOfSpeech,
      definition: item.definition,
      example: item.example,
      synonyms: item.synonyms,
      audio_url: null,
      image_url: null,
      order_index: startIndex + idx,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    cards.push(...newCards);
    setLocal('cards', cards);

    const sets = getLocal<StudySet[]>('sets', INITIAL_SETS);
    const targetSet = sets.find((s) => s.id === setId);
    if (targetSet) {
      targetSet.total_cards = cards.filter((c) => c.set_id === setId).length;
      setLocal('sets', sets);
    }

    return newCards.length;
  }

  const { data: existing } = await supabase.from('cards').select('order_index').eq('set_id', setId).order('order_index', { ascending: false }).limit(1);
  const startIndex = (existing?.[0]?.order_index ?? -1) + 1;

  const recordsToInsert = validItems.map((item, index) => ({
    set_id: setId,
    term: item.term,
    ipa: item.ipa,
    part_of_speech: item.partOfSpeech,
    definition: item.definition,
    example: item.example,
    synonyms: item.synonyms,
    order_index: startIndex + index,
  }));

  const { data, error } = await supabase.from('cards').insert(recordsToInsert).select();
  if (error) throw error;
  return data.length;
}
