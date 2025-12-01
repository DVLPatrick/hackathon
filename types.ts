export enum Category {
  CLOTHING = 'Kleidung',
  TOY = 'Spielzeug',
  ACCESSORY = 'Zubehör'
}

export enum Condition {
  NEW = 'Neu',
  USED = 'Gebraucht',
  WASH_NEEDED = 'Muss gewaschen werden',
  BROKEN = 'Kaputt'
}

export interface Item {
  id: string;
  name: string;
  category: Category;
  description: string;
  condition: Condition;
  imageUrl?: string;
  tags: string[];
}

export interface AIAnalysisResult {
  description: string;
  suggestedTags: string[];
  funFact: string;
}