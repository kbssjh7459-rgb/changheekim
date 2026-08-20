import { describe, expect, it } from 'vitest';
import {
  detectNightLighting,
  detectSports,
  detectSurface,
  extractSeoulDistrict,
  generateVenueId,
  mapReservationChannel,
  parseCoordinate,
  parseFeeRule,
  parseNumeric,
} from './normalize';

describe('parseNumeric', () => {
  it('일반 숫자 문자열을 파싱한다', () => {
    expect(parseNumeric('3366')).toBe(3366);
    expect(parseNumeric('10.256')).toBe(10.256);
  });

  it('단위가 붙은 값에서 숫자만 뽑는다', () => {
    expect(parseNumeric('3366.㎡')).toBe(3366);
    expect(parseNumeric('2.시간')).toBe(2);
  });

  it('빈 값·전각 공백만 있는 값은 undefined', () => {
    expect(parseNumeric('')).toBeUndefined();
    expect(parseNumeric(undefined)).toBeUndefined();
    expect(parseNumeric('　')).toBeUndefined();
  });
});

describe('parseCoordinate', () => {
  it('정상 범위 좌표를 통과시킨다', () => {
    expect(parseCoordinate('37.5665', 'lat')).toBeCloseTo(37.5665);
    expect(parseCoordinate('126.978', 'lng')).toBeCloseTo(126.978);
  });

  it('범위를 벗어나면 undefined', () => {
    expect(parseCoordinate('999', 'lat')).toBeUndefined();
    expect(parseCoordinate('999', 'lng')).toBeUndefined();
  });

  it('값이 없으면 undefined', () => {
    expect(parseCoordinate(undefined)).toBeUndefined();
  });
});

describe('parseFeeRule', () => {
  it('빈 값은 undefined', () => {
    expect(parseFeeRule('')).toBeUndefined();
    expect(parseFeeRule(undefined)).toBeUndefined();
  });

  it('단일 숫자 요금을 파싱한다', () => {
    const result = parseFeeRule('75000');
    expect(result?.entries).toEqual([{ label: '기본', amount: 75000 }]);
    expect(result?.raw).toBe('75000');
  });

  it('괄호 라벨 + "+" 구분 다중 요금을 파싱한다', () => {
    const result = parseFeeRule('(평일)55000+(평일야간)27500+(주말)27500+(주말야간)55000');
    expect(result?.entries).toEqual([
      { label: '평일', amount: 55000 },
      { label: '평일야간', amount: 27500 },
      { label: '주말', amount: 27500 },
      { label: '주말야간', amount: 55000 },
    ]);
  });

  it('콜론 라벨 형식을 파싱한다', () => {
    const result = parseFeeRule('평일오전:21000+평일오후:30000+주말:39000');
    expect(result?.entries).toEqual([
      { label: '평일오전', amount: 21000 },
      { label: '평일오후', amount: 30000 },
      { label: '주말', amount: 39000 },
    ]);
  });

  it('숫자 뒤 라벨 형식("50000원(평일)")을 파싱한다', () => {
    const result = parseFeeRule('50000원(평일)+60000원(주말)');
    expect(result?.entries).toEqual([
      { label: '평일', amount: 50000 },
      { label: '주말', amount: 60000 },
    ]);
  });

  it('무료(0)도 항목으로 보존한다', () => {
    const result = parseFeeRule('0');
    expect(result?.entries).toEqual([{ label: '기본', amount: 0 }]);
  });
});

describe('detectSports', () => {
  it('단일 종목을 인식한다', () => {
    expect(detectSports('축구장')).toEqual(['축구']);
    expect(detectSports('풋살경기장')).toEqual(['풋살']);
  });

  it('복합 시설유형에서 축구/풋살만 뽑는다', () => {
    expect(detectSports('축구장+테니스장')).toEqual(['축구']);
    expect(detectSports('축구장+족구장')).toEqual(['축구']);
  });

  it('무관한 시설유형은 빈 배열', () => {
    expect(detectSports('테니스장')).toEqual([]);
    expect(detectSports(undefined)).toEqual([]);
  });
});

describe('detectSurface', () => {
  it('이름에 인조잔디/천연잔디 언급이 있으면 그대로 인식', () => {
    expect(detectSurface('난지천인조잔디축구장')).toBe('인조잔디');
    expect(detectSurface('월드컵공원 천연잔디구장')).toBe('천연잔디');
  });

  it('여러 텍스트 중 하나에만 있어도 인식', () => {
    expect(detectSurface('축구장 2', '인조잔디 축구전용구장')).toBe('인조잔디');
  });

  it('언급 없으면 기타(미상)', () => {
    expect(detectSurface('은평구립축구장')).toBe('기타');
    expect(detectSurface(undefined, null)).toBe('기타');
  });
});

describe('detectNightLighting', () => {
  it('"조명" 언급이 있으면 true', () => {
    expect(detectNightLighting('조명+음향장비')).toBe(true);
  });

  it('언급 없거나 값이 없으면 false (미확인 기본값)', () => {
    expect(detectNightLighting('')).toBe(false);
    expect(detectNightLighting(undefined)).toBe(false);
    expect(detectNightLighting('음향장비')).toBe(false);
  });
});

describe('mapReservationChannel', () => {
  it('빈 값은 UNKNOWN', () => {
    expect(mapReservationChannel('')).toBe('UNKNOWN');
    expect(mapReservationChannel(undefined)).toBe('UNKNOWN');
  });

  it('인터넷·온라인·홈페이지 언급은 DISTRICT_SITE', () => {
    expect(mapReservationChannel('인터넷')).toBe('DISTRICT_SITE');
    expect(mapReservationChannel('온라인(고양시청 통합예약)')).toBe('DISTRICT_SITE');
  });

  it('방문·전화만 있으면 PHONE_VISIT', () => {
    expect(mapReservationChannel('방문+팩스')).toBe('PHONE_VISIT');
    expect(mapReservationChannel('전화')).toBe('PHONE_VISIT');
  });

  it('온라인 키워드가 우선한다 (혼합 표기)', () => {
    expect(mapReservationChannel('인터넷+방문+전화')).toBe('DISTRICT_SITE');
  });
});

describe('extractSeoulDistrict', () => {
  it('서울 주소에서 구를 뽑는다', () => {
    expect(extractSeoulDistrict('서울특별시 은평구 진관1로 46')).toBe('은평구');
  });

  it('서울이 아니거나 매칭 실패하면 undefined', () => {
    expect(extractSeoulDistrict('인천광역시 중구 마시란로 308-13')).toBeUndefined();
    expect(extractSeoulDistrict(undefined)).toBeUndefined();
    expect(extractSeoulDistrict('서울특별시')).toBeUndefined();
  });
});

describe('generateVenueId', () => {
  it('같은 입력이면 항상 같은 값', () => {
    const a = generateVenueId({ district: '강서구', name: '개화체육공원 축구장' });
    const b = generateVenueId({ district: '강서구', name: '개화체육공원 축구장' });
    expect(a).toBe(b);
  });

  it('입력이 다르면 다른 값', () => {
    const a = generateVenueId({ district: '강서구', name: 'A' });
    const b = generateVenueId({ district: '강서구', name: 'B' });
    expect(a).not.toBe(b);
  });
});
