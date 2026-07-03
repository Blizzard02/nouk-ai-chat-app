import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api.config';
import { ConversationApiService } from './conversation-api.service';

describe('ConversationApiService', () => {
  let service: ConversationApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConversationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listProviders GETs /providers', () => {
    service.listProviders().subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/providers`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('listConversations GETs /conversations', () => {
    service.listConversations().subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/conversations`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createConversation POSTs to /conversations with an empty body', () => {
    service.createConversation().subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/conversations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('getConversation GETs /conversations/:id', () => {
    service.getConversation('abc').subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/conversations/abc`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('renameConversation PATCHes /conversations/:id with the new title', () => {
    service.renameConversation('abc', 'New title').subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/conversations/abc`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'New title' });
    req.flush({});
  });

  it('updateSettings PATCHes /conversations/:id with a settings object', () => {
    service.updateSettings('abc', { temperature: 1.1 }).subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/conversations/abc`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ settings: { temperature: 1.1 } });
    req.flush({});
  });

  it('deleteConversation DELETEs /conversations/:id', () => {
    service.deleteConversation('abc').subscribe();
    const req = httpMock.expectOne(`${API_BASE_URL}/conversations/abc`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
