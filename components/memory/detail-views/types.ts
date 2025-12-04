import { MemoryItem } from '@/types/memory';

export interface DetailViewProps {
  item: MemoryItem;
  isEditing: boolean;
  editedTitle: string;
  editedUserNotes: string;
  editedTags: string[];
  editedType: string;
  editedTextContent: string;
  onTitleChange: (value: string) => void;
  onUserNotesChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
  onTypeChange: (value: string) => void;
  onTextContentChange: (value: string) => void;
  onSave: () => void;
}

export interface Relation {
  id: string;
  relation_type: string;
  to_id?: string;
  from_id?: string;
  created_at: string;
  to?: { id: string; title: string; type: string; forge_type?: string };
  from?: { id: string; title: string; type: string; forge_type?: string };
}
