alter table public.chat_sticker_pack_items drop constraint if exists chat_sticker_pack_items_payload_check;
alter table public.chat_sticker_pack_items add constraint chat_sticker_pack_items_payload_check check (
 (item_type='emoji' and ((emoji is not null and char_length(emoji) between 1 and 16 and file_path is null) or (emoji is null and file_path is not null)))
 or (item_type='sticker' and file_path is not null and emoji is null)
);
