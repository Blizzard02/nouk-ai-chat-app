import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let service: ToastService;

  beforeEach(() => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: snackBarSpy }],
    });
    service = TestBed.inject(ToastService);
  });

  it('error() opens a snackbar with the error panel class and a longer duration', () => {
    service.error('Something broke');

    expect(snackBarSpy.open).toHaveBeenCalledTimes(1);
    const [message, action, config] = snackBarSpy.open.calls.mostRecent().args;
    expect(message).toBe('Something broke');
    expect(action).toBe('Dismiss');
    expect(config?.panelClass).toContain('app-toast--error');
    expect(config?.duration).toBe(6000);
  });

  it('info() opens a snackbar with the info panel class and no dismiss action', () => {
    service.info('Saved');

    const [message, action, config] = snackBarSpy.open.calls.mostRecent().args;
    expect(message).toBe('Saved');
    expect(action).toBeUndefined();
    expect(config?.panelClass).toContain('app-toast--info');
  });
});
