import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DocenteDashboardComponent } from './docente-dashboard.component';
import { CurrentUserService } from '../../../shared/services/current-user.service';
import { ReunionesService, SolicitudReunion } from '../../../shared/services/reuniones.service';

class CurrentUserServiceStub {
  getProfile() {
    return { id: 1 };
  }
}

class ReunionesServiceStub {
  listarSolicitudes(_: { docente: number }) {
    return of([] as SolicitudReunion[]);
  }

  aprobarSolicitud() {
    return of(null);
  }

  rechazarSolicitud() {
    return of(null);
  }
}

describe('DocenteDashboardComponent', () => {
  let fixture: ComponentFixture<DocenteDashboardComponent>;
  let component: DocenteDashboardComponent;
  let reunionesService: ReunionesServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocenteDashboardComponent],
      providers: [
        { provide: CurrentUserService, useClass: CurrentUserServiceStub },
        { provide: ReunionesService, useClass: ReunionesServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocenteDashboardComponent);
    component = fixture.componentInstance;
    reunionesService = TestBed.inject(ReunionesService) as unknown as ReunionesServiceStub;
  });

  it('should create the component without restricciones visibles', () => {
    expect(component).toBeTruthy();
  });

  it('should cargar solicitudes al inicializar', () => {
    const spy = spyOn(reunionesService, 'listarSolicitudes').and.callThrough();

    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({ docente: 1 });
    expect(component.solicitudes).toEqual([]);
  });

  it('should allow toggling pendientes and historial', () => {
    fixture.detectChanges();

    expect(component.mostrarPendientes).toBeFalse();
    expect(component.mostrarHistorial).toBeFalse();

    component.togglePendientes();
    component.toggleHistorial();

    expect(component.mostrarPendientes).toBeTrue();
    expect(component.mostrarHistorial).toBeTrue();
  });
});
