const DICEBEAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg'

export const AVATARS = [
  { id: 'tomato', label: 'Tomato', seed: 'tomato' },
  { id: 'coder', label: 'Coder', seed: 'coder' },
  { id: 'target', label: 'Target', seed: 'target' },
  { id: 'books', label: 'Books', seed: 'books' },
  { id: 'coffee', label: 'Coffee', seed: 'coffee' },
  { id: 'plant', label: 'Plant', seed: 'plant' },
  { id: 'rocket', label: 'Rocket', seed: 'rocket' },
  { id: 'bulb', label: 'Light bulb', seed: 'bulb' },
  { id: 'robot', label: 'Robot', seed: 'robot' },
  { id: 'leaf', label: 'Leaf', seed: 'leaf' },
  { id: 'bolt', label: 'Bolt', seed: 'bolt' },
  { id: 'brain', label: 'Brain', seed: 'brain' },
]

export function getAvatarUrl(avatar) {
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(avatar.seed)}&size=80`
}
