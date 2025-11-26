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
      fechaSugerida: '2024-01-15',
      horaSugerida: '10:00',
      modalidadSugerida: 'online',
      creadoEn: new Date('2024-01-10T10:00:00Z'),
      actualizadoEn: new Date('2024-01-10T10:00:00Z'),
      alumno: { id: 1, nombre: 'Ana López', correo: 'ana@example.com', carrera: null, telefono: null, rol: 'alumno' },
      docente: null,
      trazabilidad: [],
    },
  ];

  constructor() {
    const baseResuelta: SolicitudReunion = {
      id: 2,
      estado: 'aprobada',
      motivo: 'Seguimiento general',
      disponibilidadSugerida: 'Martes AM',
      fechaSugerida: '2024-01-20',
      horaSugerida: '11:00',
      modalidadSugerida: 'presencial',
      creadoEn: new Date('2024-01-08T10:00:00Z'),
      actualizadoEn: new Date('2024-01-09T10:00:00Z'),
      alumno: { id: 2, nombre: 'Carlos Díaz', correo: 'carlos@example.com', carrera: null, telefono: null, rol: 'alumno' },
      docente: null,
      trazabilidad: [],
    };

    this.solicitudes = [
      this.solicitudes[0],
      baseResuelta,
      ...Array.from({ length: 10 }).map((_, idx) => ({
        ...baseResuelta,
        id: 3 + idx,
        alumno: {
          id: 3 + idx,
          nombre: `Alumno ${idx + 1}`,
          correo: `alumno${idx + 1}@example.com`,
          carrera: null,
          telefono: null,
          rol: 'alumno',
        },
        motivo: `Motivo ${idx + 1}`,
        fechaSugerida: '2024-02-01',
        horaSugerida: '12:00',
        modalidadSugerida: 'online',
        creadoEn: new Date(`2024-01-${10 + idx}T12:00:00Z`),
        actualizadoEn: new Date(`2024-01-${10 + idx}T13:00:00Z`),
      })),
    ];
  }

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
    expect(component.solicitudesResueltas.length).toBe(11);
  });

  it('should paginate historial when more than 10 solicitudes resueltas', () => {
    fixture.detectChanges();

    component.mostrarHistorial = true;
    fixture.detectChanges();

    expect(component.historialTotalPaginas).toBe(2);
    expect(component.historialPaginado.length).toBe(component.historialPorPagina);

    component.paginaHistorialSiguiente();
    expect(component.historialPagina).toBe(2);
    expect(component.historialPaginado.length).toBe(1);
  });

  it('should honor fixed fecha and hora from the alumno and compute hora termino from duracion', () => {
    fixture.detectChanges();

    const solicitud = reunionesService.solicitudes[0];
    component.abrirAprobacion(solicitud);

    expect(component.aprobarForm.controls.fecha.value).toBe('2024-01-15');
    expect(component.aprobarForm.controls.horaInicio.value).toBe('10:00');
    expect(component.fechaHoraFija).toBeTrue();
    expect(component.aprobarForm.controls.horaTermino.value).toBe('10:30');

    component.aprobarForm.controls.duracion.setValue(45);
    expect(component.aprobarForm.controls.horaTermino.value).toBe('10:45');
  });
});