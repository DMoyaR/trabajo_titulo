import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocenteDashboardComponent } from './docente-dashboard.component';

describe('DocenteDashboardComponent', () => {
  let fixture: ComponentFixture<DocenteDashboardComponent>;
  let component: DocenteDashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocenteDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocenteDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should expose every restriction with titulo and descripcion', () => {
    const restricciones = component.restricciones();

    expect(restricciones.length).toBe(13);
    expect(restricciones.every((item) => item.titulo.trim().length > 0)).toBeTrue();
    expect(restricciones.every((item) => item.descripcion.trim().length > 0)).toBeTrue();
  });

  it('should render each restriction item in the template', () => {
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
