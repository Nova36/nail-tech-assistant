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

export type PinterestPinImageVariant = {
  url: string;
  width?: number;
  height?: number;
};

export type PinterestPin = {
  id: string;
  title?: string;
  description?: string;
  alt_text?: string;
  link?: string;
  board_id?: string;
  board_owner?: {
    username?: string;
  };
  created_at?: string;
  creative_type?: string;
  dominant_color?: string;
  media?: {
    media_type?: string;
    images?: {
      [variant: string]: PinterestPinImageVariant | undefined;
    };
  };
};

export type PinterestPaginated<T> = {
  items: T[];
  bookmark: string | null;
};
