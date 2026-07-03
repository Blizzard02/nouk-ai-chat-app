import { Routes } from '@angular/router';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./components/chat-welcome/chat-welcome.component').then(
        (m) => m.ChatWelcomeComponent,
      ),
  },
  {
    path: 'c/:id',
    loadComponent: () =>
      import('./components/chat-page/chat-page.component').then((m) => m.ChatPageComponent),
  },
];
