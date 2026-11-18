import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('keyboard, grammar answers, dictionary, flashcard and analytics work entirely on loopback',async({page,context,baseURL})=>{
  const external:string[]=[];
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{
    if (new URL(route.request().url()).origin===baseURL) return route.continue();
    external.push(route.request().url());return route.abort();
  });
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Tổng quan học tập'})).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Đến nội dung'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('link',{name:'Học ngữ pháp',exact:true}).click();
  await page.getByRole('link',{name:'Ôn 12 thì tiếng Anh'}).click();
  await page.locator('a[href="/grammar/present-simple"]').click();
  await expect(page.getByRole('heading',{name:/Thì hiện tại đơn/})).toBeVisible();
  await page.getByText('Thói quen và việc lặp lại',{exact:true}).click();
  await page.getByText('Our office recycles paper every Friday.',{exact:true}).scrollIntoViewIfNeeded();
  await expect(page.getByText('Văn phòng chúng tôi tái chế giấy vào mỗi thứ Sáu.')).toBeVisible();
  await page.getByRole('button',{name:'A checks',exact:true}).click();
  await page.getByRole('button',{name:'Kiểm tra đáp án'}).click();
  await expect(page.getByText('Chính xác',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Đánh dấu đã học'}).click();
  await expect(page.getByRole('button',{name:'Đã học',exact:true})).toBeVisible();
  await page.getByRole('navigation').getByRole('link',{name:'Từ vựng'}).click();
  await page.getByRole('textbox',{name:'Tìm từ, nghĩa hoặc cụm từ'}).fill('hoa don');
  await page.getByRole('link',{name:/invoice noun/}).click();
  await expect(page.getByRole('heading',{name:'invoice',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'verb',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Phát âm invoice'}).click();
  await expect(page.getByText('Đang phát giọng máy đã lưu · en-US')).toBeVisible();
  await page.goto('/vocabulary?mode=flash');
  await page.getByRole('button',{name:'Lật thẻ',exact:true}).first().click();
  await page.getByRole('button',{name:'Đã nhớ',exact:true}).click();
  await page.getByRole('navigation').getByRole('link',{name:'Tiến độ'}).click();
  await expect(page.getByText('1 nghĩa đã học')).toBeVisible();
  await page.getByRole('button',{name:'Độ phủ nội dung'}).click();
  await expect(page.getByText('38 tệp giọng máy')).toBeVisible();
  await page.getByRole('navigation').getByRole('link',{name:'AI Tutor'}).click();
  await expect(page.getByText('Chưa kết nối',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Continue with ChatGPT'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Gửi câu hỏi'})).toBeDisabled();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('V3.3 grammar chapters, bilingual examples and the source quiz are visible',async({page})=>{
  await page.goto('/grammar');
  await expect(page.getByText('38 bài',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Tổng quan 12 thì'})).toBeVisible();
  await page.getByLabel('Chủ điểm').selectOption('Thể của động từ');
  await expect(page.getByRole('link',{name:'Tổng quan 12 thì'})).toHaveCount(0);
  await page.locator('a[href="/grammar/passive-voice"]').click();
  await expect(page.getByRole('heading',{name:/Câu bị động/})).toBeVisible();
  await page.getByText('Bị động hiện tại đơn',{exact:true}).click();
  await expect(page.getByText('Invoices are processed every Friday.',{exact:true})).toBeVisible();
  await page.getByText('Bị động với will và modal',{exact:true}).click();
  await page.getByRole('button',{name:'B be processed',exact:true}).click();
  await page.getByRole('button',{name:'Kiểm tra đáp án'}).click();
  await expect(page.getByText('Chính xác',{exact:true})).toBeVisible();
});

test('all tenses share one library and both vocabulary accents play on loopback',async({page,context,baseURL})=>{
  const external:string[]=[];
  await context.route('**/*',route=>{
    if (new URL(route.request().url()).origin===baseURL) return route.continue();
    external.push(route.request().url());return route.abort();
  });
  await page.goto('/grammar?topic=tenses');
  const library=page.locator('#tense-library');
  for (const group of ['Hiện tại','Quá khứ','Tương lai']) {
    await expect(library.getByRole('region',{name:group,exact:true}).getByRole('link',{name:'Xem bài'})).toHaveCount(4);
  }
  await library.locator('a[href="/grammar/future-perfect-continuous"]').click();
  await expect(page.getByRole('heading',{name:/Tương lai hoàn thành tiếp diễn/})).toBeVisible();
  await page.getByRole('button',{name:'Mở tất cả'}).click();
  await expect(page.locator('details[open] .example').first()).toBeVisible();
  await page.getByRole('link',{name:'12 thì tiếng Anh',exact:true}).click();
  await expect(library).toBeVisible();
  await page.goto('/vocabulary?collection=bsl&sort=frequency');
  await expect(page.locator('.collection-count strong')).toHaveText('1744');
  await page.getByLabel('Bộ từ').selectOption('ngsl');
  await expect(page.locator('.collection-count strong')).toHaveText('2809');
  await page.getByLabel('Bộ từ').selectOption('tsl');
  await expect(page.locator('.collection-count strong')).toHaveText('1250');
  await page.getByRole('textbox',{name:'Tìm từ, nghĩa hoặc cụm từ'}).fill('airport');
  await page.getByRole('link',{name:/^A airport noun/}).click();
  await expect(page.getByRole('heading',{name:'airport',exact:true})).toBeVisible();
  await expect(page.getByText('airport terminal · airport shuttle · at the airport')).toBeVisible();
  await expect(page.getByText('airports',{exact:true})).toBeVisible();
  for (const [accent,code] of [['US','en-US'],['UK','en-GB']]) {
    await page.getByRole('button',{name:'Phát âm '+accent+' airport'}).click();
    await expect(page.getByText('Đang phát giọng máy cục bộ · '+code)).toBeVisible();
    await expect(page.getByText(new RegExp('IPA giọng máy '+code.slice(-2)))).toBeVisible();
  }
  expect(external).toEqual([]);
});

test('Reading exam autosaves, recovers, scores and explains the grouped material',async({page})=>{
  await page.goto('/exams');
  await expect(page.getByRole('button',{name:'Bắt đầu Full TOEIC',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Bắt đầu Half Test',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Bắt đầu Đề luyện Reading'}).click();
  await expect(page.getByRole('heading',{name:'Đề luyện Reading',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^B /}).click();
  await expect(page.getByText('Đã lưu lựa chọn')).toBeVisible();
  await page.getByRole('button',{name:'Đánh dấu',exact:true}).click();
  await expect(page.getByRole('button',{name:'Câu 1, đã đánh dấu',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 / 20 đã trả lời')).toBeVisible();
  await page.getByRole('button',{name:'Câu 1, đã đánh dấu',exact:true}).click();
  await expect(page.getByRole('button',{name:/^B /})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Nộp bài',exact:true}).click();
  await page.getByRole('button',{name:'Xác nhận nộp',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Kết quả bài làm'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Ôn cách dùng ngữ pháp'}).first()).toBeVisible();
  await page.goto('/practice');
  await page.getByRole('button',{name:/Part 1 Mô tả ảnh/}).click();
  await page.getByRole('button',{name:'Bắt đầu Luyện tập',exact:true}).click();
  await expect(page.getByRole('img',{name:'Ảnh tình huống của câu hỏi'})).toBeVisible();
  await expect.poll(()=>page.locator('audio').evaluate((audio:HTMLAudioElement)=>audio.duration)).toBeGreaterThan(1);
  await expect(page.getByText('Giọng máy · audio luyện nghe offline')).toBeVisible();
  await expect(page.getByText('Kịch bản nghe')).toHaveCount(0);
});

test('ZIP is downloaded, validated, previewed and confirmed through the browser',async({page})=>{
  await page.goto('/settings');
  await page.getByLabel('Loại gói').selectOption('progress');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Tải ZIP'}).click();
  const saved=await download;
  expect(saved.suggestedFilename()).toContain('progress');
  await page.getByLabel('Tệp ZIP').setInputFiles(await saved.path());
  await page.getByRole('button',{name:'Xem trước',exact:true}).click();
  await expect(page.getByText('Đã xác minh gói. Dữ liệu đang học chưa thay đổi.')).toBeVisible();
  await page.getByRole('button',{name:'Xác nhận hợp nhất'}).click();
  await expect(page.getByText('Đã hợp nhất dữ liệu.')).toBeVisible();
  await expect(page.getByText(/Điểm khôi phục trong thư mục backups/)).toBeVisible();
});

test('dashboard and knowledge routes stay accessible at 390, 768 and 1440px',async({page})=>{
  for (const width of [390,768,1440]) {
    await page.setViewportSize({width,height:900});
    for (const [url,title] of [['/','Tổng quan học tập'],['/grammar','Ngữ pháp trong ngữ cảnh'],['/vocabulary','Từ vựng trong ngữ cảnh']]) {
      await page.goto(url);
      await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
  await page.goto('/');
  await expect(page.getByText('Đến hạn ôn',{exact:true})).toBeVisible();
  const violations=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(violations.violations).toEqual([]);
  expect(await page.evaluate(()=>getComputedStyle(document.querySelector('main')!).animationDuration)).toBe('1e-05s');
  await page.setViewportSize({width:390,height:844});
  const menu=page.getByRole('button',{name:'Mở menu'});
  await menu.click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
});
