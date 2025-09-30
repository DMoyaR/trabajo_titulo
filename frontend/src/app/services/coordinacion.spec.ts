import { TestBed } from '@angular/core/testing';

import { Coordinacion } from './coordinacion';

describe('Coordinacion', () => {
  let service: Coordinacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Coordinacion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
