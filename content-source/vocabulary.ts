import officeLemmas from './office-lemmas.json';

export const officeTopics=new Map(Object.entries(officeLemmas).flatMap(([topic,lemmas])=>lemmas.map(lemma=>[lemma,topic] as const)));

export const englishWordnet = {
  id:'oewn-2025', name:'Open English Wordnet 2025', version:'2025', license:'CC-BY-4.0 / Princeton WordNet License',
  url:'https://en-word.net/static/english-wordnet-2025.xml.gz',
  sha256:'9ca6d1dcb75f822fdd66617f7d9da48142ace38dd544d6ad5e2feca1674ad3fe',
  attribution:'Open English Wordnet team (2025); incorporates elements of the Princeton University WordNet database.',
};
export const coreWords = ['application','appointment','approval','approve','available','confirm','deadline','direct','inventory','invoice','maintenance','negotiate','record','reimbursement','schedule','shipment'];
export const enrichment = {
  'application__1.10.00..': ['đơn xin; hồ sơ ứng tuyển','Hiring','submit an application','We received your application on Tuesday.','Chúng tôi đã nhận được hồ sơ ứng tuyển của bạn vào thứ Ba.','Please sign the application before uploading it.','Vui lòng ký vào đơn trước khi tải lên.'],
  'appointment__1.14.00..': ['cuộc hẹn','Office','reschedule an appointment','I booked an appointment for Friday morning.','Tôi đã đặt lịch hẹn vào sáng thứ Sáu.','Could we move our appointment to next week?','Ta có thể dời cuộc hẹn sang tuần sau không?'],
  'approval__1.04.02..': ['sự phê duyệt chính thức','Office','obtain approval','The order requires approval from Finance.','Đơn đặt hàng cần được phòng Tài chính phê duyệt.','We obtained approval to replace the printer.','Chúng tôi đã được duyệt thay máy in.'],
  'approve__2.32.00..': ['phê duyệt; chấp thuận','Office','approve a request','The director approved the revised budget.','Giám đốc đã phê duyệt ngân sách điều chỉnh.','Only the supervisor can approve overtime.','Chỉ người giám sát mới có quyền duyệt làm thêm giờ.'],
  'available__3.00.00..': ['có sẵn; có thể sử dụng','Office','available on request','A digital copy is available on request.','Có thể yêu cầu một bản điện tử.','Two desks are available for visitors.','Có sẵn hai bàn làm việc cho khách.'],
  'available__5.00.00.free.00': ['rảnh; có thể tham gia','Office','available for a call','Is anyone available for a call this afternoon?','Chiều nay có ai rảnh để gọi điện không?','Nadia is available after her interview.','Nadia rảnh sau cuộc phỏng vấn.'],
  'deadline__1.28.00..': ['hạn chót','Office','meet a deadline','The deadline for proposals is noon on Thursday.','Hạn nộp đề xuất là trưa thứ Năm.','Can your team meet the revised deadline?','Nhóm của bạn có kịp hạn chót đã điều chỉnh không?'],
  'direct__5.00.00.immediate.00': ['trực tiếp; không qua trung gian','Travel','direct flight','There is a direct flight to Osaka every morning.','Mỗi sáng đều có chuyến bay thẳng đến Osaka.','The supplier offers direct sales to schools.','Nhà cung cấp bán trực tiếp cho các trường học.'],
  'inventory__1.06.00..': ['hàng tồn kho','Logistics','inventory levels','Inventory is low at our southern warehouse.','Hàng tồn kho ở kho phía nam đang ở mức thấp.','The sale helped reduce excess inventory.','Đợt giảm giá giúp giảm lượng hàng tồn dư.'],
  'invoice__1.10.00..': ['hóa đơn yêu cầu thanh toán','Finance','issue an invoice','Please include the order number on the invoice.','Vui lòng ghi mã đơn hàng trên hóa đơn.','The supplier sent a corrected invoice today.','Hôm nay nhà cung cấp đã gửi hóa đơn đã sửa.'],
  'invoice__2.40.00..': ['lập và gửi hóa đơn cho','Finance','invoice a client','We invoice customers at the end of each month.','Chúng tôi gửi hóa đơn cho khách hàng vào cuối mỗi tháng.','The contractor invoiced us for three site visits.','Nhà thầu đã gửi hóa đơn cho chúng tôi tính phí ba chuyến khảo sát.'],
  'maintenance__1.04.00..': ['việc bảo trì','Facilities','routine maintenance','Routine maintenance takes place on Sundays.','Công việc bảo trì định kỳ diễn ra vào Chủ nhật.','Regular maintenance prevents equipment failures.','Bảo trì thường xuyên giúp ngăn thiết bị hỏng.'],
  'negotiate__2.32.00..': ['đàm phán; thương lượng','Sales','negotiate a contract','They are negotiating a new service contract.','Họ đang đàm phán một hợp đồng dịch vụ mới.','We negotiated a lower rate for group bookings.','Chúng tôi đã thương lượng được mức giá thấp hơn cho đặt chỗ theo nhóm.'],
  'record__2.32.00..': ['ghi lại; lưu lại','Office','record expenses','Please record all travel expenses in the spreadsheet.','Vui lòng ghi lại mọi chi phí đi lại trong bảng tính.','The receptionist recorded each delivery in a logbook.','Nhân viên lễ tân đã ghi lại từng lần giao hàng trong sổ theo dõi.'],
  'reimbursement__1.21.00..': ['khoản hoàn lại chi phí; tiền bồi hoàn','Finance','request reimbursement','Keep your receipts to request reimbursement.','Hãy giữ biên lai để yêu cầu hoàn lại chi phí.','The company issued a reimbursement for the train fare.','Công ty đã hoàn lại tiền vé tàu.'],
  'schedule__1.10.00..': ['lịch trình; bảng giờ','Travel','check the schedule','The last bus on the schedule leaves at nine.','Theo lịch, chuyến xe buýt cuối cùng khởi hành lúc chín giờ.','Check the schedule for your departure time.','Hãy kiểm tra giờ khởi hành của bạn trên lịch trình.'],
  'schedule__2.32.00..': ['xếp lịch; lên lịch','Office','schedule a meeting','We scheduled the inspection for Monday.','Chúng tôi đã lên lịch kiểm tra vào thứ Hai.','Can you schedule a call with our supplier?','Bạn có thể xếp lịch gọi điện với nhà cung cấp không?'],
  'shipment__1.06.00..': ['lô hàng vận chuyển','Logistics','track a shipment','The shipment arrived a day early.','Lô hàng đến sớm một ngày.','We are tracking a shipment of office chairs.','Chúng tôi đang theo dõi một lô ghế văn phòng.'],
} satisfies Record<string, readonly [string,string,string,string,string,string,string]>;
export const families: Record<string,string[]> = {
  approval:['approve','approved','disapproval'], approve:['approval','approved','disapprove'],
  application:['apply','applicant','applicable'], available:['availability','unavailable'],
  confirm:['confirmation','confirmed'], reimbursement:['reimburse','reimbursable'],
  negotiate:['negotiation','negotiator','negotiable'], maintenance:['maintain','maintainable'],
  schedule:['scheduled','reschedule','scheduling'], shipment:['ship','shipping','shipper'],
  direct:['direction','directly','directional','redirect'], record:['recording','recorder','recorded'],
};
export const ipa: Record<string,[string,string]> = {
  deadline:['/ˈdɛd.laɪn/','/ˈdɛd.laɪn/'], invoice:['/ˈɪn.vɔɪs/','/ˈɪn.vɔɪs/'],
  schedule:['/ˈskɛdʒ.uːl/','/ˈʃɛd.juːl/'], reimbursement:['/ˌriː.ɪmˈbɝːs.mənt/','/ˌriː.ɪmˈbɜːs.mənt/'],
  negotiate:['/nɪˈɡoʊ.ʃi.eɪt/','/nɪˈɡəʊ.ʃi.eɪt/'], approval:['/əˈpruː.vəl/','/əˈpruː.vəl/'],
  maintenance:['/ˈmeɪn.tə.nəns/','/ˈmeɪn.tə.nəns/'], appointment:['/əˈpɔɪnt.mənt/','/əˈpɔɪnt.mənt/'],
  inventory:['/ˈɪn.vənˌtɔːr.i/','/ˈɪn.vən.tər.i/'], shipment:['/ˈʃɪp.mənt/','/ˈʃɪp.mənt/'],
  available:['/əˈveɪ.lə.bəl/','/əˈveɪ.lə.bəl/'], confirm:['/kənˈfɝːm/','/kənˈfɜːm/'],
  approve:['/əˈpruːv/','/əˈpruːv/'], application:['/ˌæp.lɪˈkeɪ.ʃən/','/ˌæp.lɪˈkeɪ.ʃən/'],
};
