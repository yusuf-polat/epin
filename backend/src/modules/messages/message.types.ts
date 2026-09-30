export interface StartConversationDTO {
  targetUserId: string;
  productId?: string;
}

export interface SendMessageDTO {
  text: string;
}
