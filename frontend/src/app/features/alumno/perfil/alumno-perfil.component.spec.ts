import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlumnoPerfilComponent } from './alumno-perfil.component';
import { CurrentUserService } from '../../../shared/services/current-user.service';

class CurrentUserServiceMock {
  getProfile = jasmine.createSpy('getProfile').and.returnValue(null);
}

describe('AlumnoPerfilComponent', () => {
  let fixture: ComponentFixture<AlumnoPerfilComponent>;
  let component: AlumnoPerfilComponent;
  let currentUserService: CurrentUserServiceMock;

  beforeEach(async () => {
    currentUserService = new CurrentUserServiceMock();

    await TestBed.configureTestingModule({
      imports: [AlumnoPerfilComponent],
      providers: [{ provide: CurrentUserService, useValue: currentUserService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AlumnoPerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should expose all restricciones with titulo and descripcion', () => {
    const restricciones = component.restricciones();

    expect(restricciones.length).toBe(10);
    expect(restricciones.every((item) => item.titulo.trim().length > 0)).toBeTrue();
    expect(restricciones.every((item) => item.descripcion.trim().length > 0)).toBeTrue();
  });

  it('should render each restriction in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const renderedItems = Array.from(compiled.querySelectorAll('.restricciones-list li'));

    expect(renderedItems.length).toBe(component.restricciones().length);

    component.restricciones().forEach((item, index) => {
      const title = renderedItems[index].querySelector('h4')?.textContent?.trim();
      const description = renderedItems[index].querySelector('p')?.textContent?.trim();

      expect(title).toBe(item.titulo);
      expect(description).toBe(item.descripcion);
    });
  });
});
