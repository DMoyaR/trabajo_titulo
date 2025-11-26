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
  solicitudes: SolicitudReunion[] = [
    {
      id: 1,
      estado: 'pendiente',
      motivo: 'Revisar capítulo 1',
      disponibilidadSugerida: null,
      creadoEn: new Date('2024-01-10T10:00:00Z'),
      actualizadoEn: new Date('2024-01-10T10:00:00Z'),
      alumno: { id: 1, nombre: 'Ana López', correo: 'ana@example.com', carrera: null, telefono: null, rol: 'alumno' },
      docente: null,
      trazabilidad: [],
    },
    {
      id: 2,
      estado: 'aprobada',
      motivo: 'Seguimiento general',
      disponibilidadSugerida: 'Martes AM',
      creadoEn: new Date('2024-01-08T10:00:00Z'),
      actualizadoEn: new Date('2024-01-09T10:00:00Z'),
      alumno: { id: 2, nombre: 'Carlos Díaz', correo: 'carlos@example.com', carrera: null, telefono: null, rol: 'alumno' },
      docente: null,
      trazabilidad: [],
    },
  ];

  listarSolicitudes(_: { docente: number }) {
    return of(this.solicitudes);
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
    expect(component.solicitudes).toEqual(reunionesService.solicitudes);
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

  it('should only show solicitudes pendientes when reviewing', () => {
    fixture.detectChanges();

    expect(component.solicitudesPendientes.length).toBe(1);
    expect(component.solicitudesResueltas.length).toBe(1);
  });
});