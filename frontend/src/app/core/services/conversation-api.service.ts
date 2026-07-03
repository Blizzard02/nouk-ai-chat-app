import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  Conversation,
  ConversationSettings,
  ConversationSummary,
  ProviderInfo,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class ConversationApiService {
  private readonly http = inject(HttpClient);

  listProviders(): Observable<ProviderInfo[]> {
    return this.http.get<ProviderInfo[]>(`${API_BASE_URL}/providers`);
  }

  listConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(`${API_BASE_URL}/conversations`);
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${API_BASE_URL}/conversations/${id}`);
  }

  createConversation(): Observable<Conversation> {
    return this.http.post<Conversation>(`${API_BASE_URL}/conversations`, {});
  }

  renameConversation(id: string, title: string): Observable<Conversation> {
    return this.http.patch<Conversation>(`${API_BASE_URL}/conversations/${id}`, { title });
  }

  updateSettings(id: string, settings: Partial<ConversationSettings>): Observable<Conversation> {
    return this.http.patch<Conversation>(`${API_BASE_URL}/conversations/${id}`, { settings });
  }

  deleteConversation(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/conversations/${id}`);
  }
}
