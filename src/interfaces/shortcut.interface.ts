export enum ShortcutActionType {
  NAVIGATE = 'NAVIGATE',
  CHANGE_ACCOUNT = 'CHANGE_ACCOUNT',
}

export interface ShortcutParams {
  selectedCurrency?: 'hive' | 'hbd';
  powerType?: string;
}

export interface ShortcutDefinition {
  id: string;
  combo: string;
  actionType: ShortcutActionType;
  target: string;
  params?: ShortcutParams;
}
