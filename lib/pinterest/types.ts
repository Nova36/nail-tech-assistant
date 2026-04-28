export type PinterestUserAccount = {
  username: string;
  account_type: string;
};

export type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
  pin_count?: number;
  follower_count?: number;
  created_at?: string;
  board_pins_modified_at?: string;
  media?: {
    cover_images?: unknown[];
    image_cover_url?: string;
    [key: string]: unknown;
  };
  owner?: {
    username?: string;
  };
};

export type PinterestPaginated<T> = {
  items: T[];
  bookmark: string | null;
};
