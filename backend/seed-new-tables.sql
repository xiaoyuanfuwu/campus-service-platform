-- ============================================================
-- 新模块种子数据脚本
-- 填充：校园黄页(60条)、校园题库(8条)、图鉴分类(7条)+条目(157条)、成就赛道(4条)+成就项(12条)
-- ============================================================

-- ========================
-- 1. 校园黄页
-- ========================
INSERT INTO yellowpages (name, category, phone, fax, email, location, description, sort_order) VALUES
('学校办公室','党政机构','0000-0000000','','office@example.edu.cn','行政楼','示例数据，请替换为本校实际信息',1),
('教务处','教学机构','0000-0000000','','academic@example.edu.cn','行政楼','本科教学、学籍与考试管理',1),
('学生工作处','学生事务','0000-0000000','','student@example.edu.cn','学生服务中心','学生事务与校园服务',1),
('后勤服务中心','后勤保障','0000-0000000','','','后勤楼','餐饮、公寓与维修服务',1),
('图书馆','教辅单位','0000-0000000','','','图书馆','借阅、检索与学习空间服务',1),
('国际交流处','国际交流','0000-0000000','','','行政楼','国际合作与交流项目',1),
('校医院','附属单位','0000-0000000','','','校医院','校内基础医疗与健康服务',1);

-- ========================
-- 2. 校园题库
-- ========================
INSERT INTO `questionbanks` (`name`, `category`, `course`, `year`, `question_count`, `sort_order`) VALUES
('高等数学（上）期末真题','高数','高等数学','2025',28,1),
('线性代数期中试题','高数','线性代数','2025',20,2),
('大学英语四级真题','英语','综合英语','2024',35,3),
('六级翻译专项','英语','综合英语','2024',15,4),
('马克思主义基本原理','思政','马原','2025',25,5),
('思想道德与法治','思政','思修','2025',22,6),
('数据结构期末试卷','专业课','数据结构','2025',18,7),
('计算机网络复习题','专业课','计网','2024',30,8);

-- ========================
-- 3. 图鉴分类
-- ========================
INSERT INTO `guide_categories` (`category_key`, `name`, `tag`, `description`, `color`, `color_light`, `sort_order`) VALUES
('landmarks','校园地标','校园记忆','校园南门、图书馆、校园湖……校园的每一处角落','#FF9500','#FFB347',1),
('organizations','社团组织','组织一览','学生会、融媒体、机器人团队……找到你的归属','#AF52DE','#D98CF0',2),
('animals','动物图鉴','萌宠集合','校园湖的鹅、校园各处的小毛孩们','#30D158','#6EE890',3),
('plants','植物图鉴','绿植百科','认识校园里每一棵树、每一朵花','#5EB864','#8FD990',4),
('awards','任职评优','荣誉体系','学生干部、奖学金、荣誉称号全指南','#FF6B35','#FF9A70',5),
('certificates','证书图鉴','考证百科','四六级、计算机、教资……大学必考证书一览','#0A84FF','#5EAFFF',6),
('limited','限定图鉴','季节限定','银杏金黄、海棠花开、雪景……错过等一年的美景','#FF375F','#FF7A90',7);

-- ========================
-- 4. 图鉴条目
-- ========================
INSERT INTO `guide_items` (`category_key`, `name`, `description`, `emoji`, `icon`, `sort_order`) VALUES

-- 校园地标 (12)
('landmarks','校园南门','大学路1号新校区南大门，校园第一地标。门前泰山石与迎客松庄重大气，每个本校学生的入学合影首选。','🚪','/images/guide-icons/00.png',1),
('landmarks','校名石','南门广场的校名石，刻有「示例大学」字样；请替换为本校实际介绍。','🪨','/images/guide-icons/01.png',2),
('landmarks','图书馆','校园主要图书馆，提供阅览、自习与数字资源服务；请替换为本校实际介绍。','📚','/images/guide-icons/02.png',3),
('landmarks','建筑艺术博物馆','校藏瑰宝，3000平方米展陈空间，藏品1700余件，北朝人面瓦当等珍贵文物在此展出。','🏛️','/images/guide-icons/03.png',4),
('landmarks','体育馆','因造型酷似鸟巢而得名，校园标志性体育建筑。篮球馆、羽毛球场、乒乓球场地一应俱全。','🏟️','/images/guide-icons/04.png',5),
('landmarks','三大餐厅','第一餐厅、第二餐厅、第三餐厅各具特色，各地美食琳琅满目，舌尖上的工程大从此开始。','🍽️','/images/guide-icons/05.png',6),
('landmarks','学生公寓','标准四人间，上床下桌布局，空调电扇一应俱全。温馨小窝里装着四年青春。','🏠','/images/guide-icons/06.png',7),
('landmarks','校园湖','校园北部湖光水景，湖中养有黑天鹅和白天鹅、可爱的小鸭子。日落时分波光粼粼，校园最治愈的角落。','🦢','/images/guide-icons/07.png',8),
('landmarks','景观湖','校园内另一处水景，春夏绿意盎然，秋日芦苇随风飘摇，冬日白雪披身。一湖清水润校园。','🏞️','/images/guide-icons/08.png',9),
('landmarks','情人坡','位于校园高坡之处，可俯瞰校园全景。观日升赏日落，读书野餐漫步谈天的好去处。','🌸','/images/guide-icons/09.png',10),
('landmarks','主教学楼','校园核心建筑，阶梯教室与多媒体教室分布其中，铃声响起时人潮涌动的景象最是壮观。','🏫','/images/guide-icons/10.png',11),
('landmarks','运动场','15.5万平方米运动场地！篮球馆2座、田径场4块、足球场35块、篮球场30块……挥洒汗水的圣地。','🏃','/images/guide-icons/11.png',12),

-- 社团组织 (60)
('organizations','校学生会','','🏛️','/images/guide-icons/12.png',1),
('organizations','校研究生会','','🎓','/images/guide-icons/13.png',2),
('organizations','大学生社团联合会','','🤝','/images/guide-icons/14.png',3),
('organizations','大学生青年志愿者协会','','❤️','/images/guide-icons/15.png',4),
('organizations','大学生科学技术协会','','🔬','/images/guide-icons/16.png',5),
('organizations','大学生服务保障中心','','🛎️','/images/guide-icons/17.png',6),
('organizations','大学生女生联合会','','🌸','/images/guide-icons/18.png',7),
('organizations','大学生融媒体中心','','📸','/images/guide-icons/19.png',8),
('organizations','UPRE机器人团队','','🤖','/images/guide-icons/20.png',9),
('organizations','习近平新时代中国特色社会主义思想研究会','','📖','/images/guide-icons/21.png',10),
('organizations','马克思主义理论研学社','','📕','/images/guide-icons/22.png',11),
('organizations','稷下学社','','💭','/images/guide-icons/23.png',12),
('organizations','旗帜社','','🚩','/images/guide-icons/12.png',13),
('organizations','心理家园协会','','🧠','/images/guide-icons/13.png',14),
('organizations','新时代·诵经典·青马学社','','📜','/images/guide-icons/14.png',15),
('organizations','数学建模协会','','🔢','/images/guide-icons/15.png',16),
('organizations','3D协会','','🖨️','/images/guide-icons/16.png',17),
('organizations','机器人协会','','⚙️','/images/guide-icons/17.png',18),
('organizations','互联网创新创业协会','','🌐','/images/guide-icons/18.png',19),
('organizations','TRIZ发明与创新协会','','💡','/images/guide-icons/19.png',20),
('organizations','凌云车队','','🏎️','/images/guide-icons/20.png',21),
('organizations','创新航模协会','','✈️','/images/guide-icons/21.png',22),
('organizations','GIS社团','','🗺️','/images/guide-icons/22.png',23),
('organizations','工程导航社','','🧭','/images/guide-icons/23.png',24),
('organizations','学生家园','','🌳','/images/guide-icons/12.png',25),
('organizations','大学生书画社','','🖌️','/images/guide-icons/13.png',26),
('organizations','剧锋艺术团','','🎭','/images/guide-icons/14.png',27),
('organizations','齐艺艺术社','','🎵','/images/guide-icons/15.png',28),
('organizations','大学生艺术团','','🎨','/images/guide-icons/16.png',29),
('organizations','声音吉他协会','','🎸','/images/guide-icons/17.png',30),
('organizations','新欣交谊舞协会','','💃','/images/guide-icons/18.png',31),
('organizations','Earth Power街舞社','','🕺','/images/guide-icons/19.png',32),
('organizations','漫画社','','🎨','/images/guide-icons/20.png',33),
('organizations','馨语相声社','','🎤','/images/guide-icons/21.png',34),
('organizations','红学研究协会','','📚','/images/guide-icons/22.png',35),
('organizations','校英语协会','','🔤','/images/guide-icons/23.png',36),
('organizations','匠心创意艺术社','','✂️','/images/guide-icons/12.png',37),
('organizations','传统杨氏太极拳协会','','🥋','/images/guide-icons/13.png',38),
('organizations','乒羽社','','🏸','/images/guide-icons/14.png',39),
('organizations','羽毛球协会','','🏸','/images/guide-icons/15.png',40),
('organizations','龙魂台球社','','🎱','/images/guide-icons/16.png',41),
('organizations','跆拳道协会','','🥋','/images/guide-icons/17.png',42),
('organizations','大学生电子竞技协会','','🎮','/images/guide-icons/18.png',43),
('organizations','HUOE桌游协会','','🎲','/images/guide-icons/19.png',44),
('organizations','KY曳舞团','','🏃','/images/guide-icons/20.png',45),
('organizations','「一米阳光」关爱儿童协会','','☀️','/images/guide-icons/21.png',46),
('organizations','红十字彩生活志愿服务队','','➕','/images/guide-icons/22.png',47),
('organizations','爱心协会','','💝','/images/guide-icons/23.png',48),
('organizations','轻尘义工协会','','🌿','/images/guide-icons/12.png',49),
('organizations','心语手语社','','🤟','/images/guide-icons/13.png',50),
('organizations','绿化树环保协会','','🌲','/images/guide-icons/14.png',51),
('organizations','大学生心理健康协会','','💚','/images/guide-icons/15.png',52),
('organizations','引领食尚','','🍳','/images/guide-icons/16.png',53),
('organizations','校学风建设委员会','','📋','/images/guide-icons/17.png',54),
('organizations','温馨家园建设委员会','','🏡','/images/guide-icons/18.png',55),
('organizations','OTC推理社','','🔍','/images/guide-icons/19.png',56),
('organizations','「自由人」摄影协会','','📷','/images/guide-icons/20.png',57),
('organizations','治城学社','','🏙️','/images/guide-icons/21.png',58),
('organizations','新媒体中心','','📱','/images/guide-icons/22.png',59),
('organizations','逸风航模协会','','🚀','/images/guide-icons/23.png',60),

-- 动物图鉴 (12)
('animals','校园橘猫「大橘」','','🐱','/images/guide-icons/24.png',1),
('animals','校园湖黑天鹅','','🦢','/images/guide-icons/25.png',2),
('animals','校园湖白天鹅','','🦢','/images/guide-icons/26.png',3),
('animals','校园湖鸭群','','🦆','/images/guide-icons/27.png',4),
('animals','校园流浪猫群','','🐱','/images/guide-icons/28.png',5),
('animals','流浪猫「亮亮」','','🐱','/images/guide-icons/29.png',6),
('animals','校园流浪狗','','🐶','/images/guide-icons/30.png',7),
('animals','鉴湖锦鲤','','🐟','/images/guide-icons/31.png',8),
('animals','鉴湖鹅鸭','','🦢','/images/guide-icons/32.png',9),
('animals','校园麻雀','','🐦','/images/guide-icons/33.png',10),
('animals','校园灰喜鹊','','🐦','/images/guide-icons/34.png',11),
('animals','校园湖蛙类','','🐸','/images/guide-icons/35.png',12),

-- 植物图鉴 (20)
('plants','银杏','校园秋日名片！落叶大乔木，扇形叶片秋季变为金黄。教学区广场周围种植，秋天金黄大道是朋友圈摄影大赛主场。','🍂','/images/guide-icons/36.png',1),
('plants','法国梧桐','校园行道树主力军！落叶乔木，树皮灰绿色，叶掌状3~5裂。夏季提供良好遮阴，是绿色廊道的主要树种。','🌳','/images/guide-icons/37.png',2),
('plants','垂柳','校园湖畔杨柳依依垂，道旁鲜花欣欣迎。春天新叶嫩绿如丝，很有诗意。湖边最常见的景观树。','🌿','/images/guide-icons/38.png',3),
('plants','雪松','位于主教前面旗杆附近，常绿乔木，原产喜马拉雅山脉。树形优美，是黎巴嫩国树，常用于草坪或建筑物两侧列植。','🌲','/images/guide-icons/39.png',4),
('plants','海棠','教学区广场周围种植的观赏性乔木。春日粉白花朵缀满枝头，是校园春天最浪漫的打卡点。','🌺','/images/guide-icons/40.png',5),
('plants','月季','教学区乔木下配置的花草，形成美丽的立体林荫道。花色丰富，花期长，从春到秋持续绽放。','🌹','/images/guide-icons/41.png',6),
('plants','紫薇','小乔木或灌木，花期6~9月，又称「百日红」。树干愈老愈光滑，用手抚摸全株会微微颤动，故别名「痒痒树」。','🌸','/images/guide-icons/42.png',7),
('plants','红叶李','广场周边、中央草坪种植，独特的紫红色叶色一年四季都很美丽。群植成片构成风景林，美化效果远超单纯绿色林。','🍃','/images/guide-icons/43.png',8),
('plants','迎春','落叶灌木，冬末至早春先花后叶，花色金黄。配置在湖边、溪畔、桥头、墙隅，是校园春天的第一抹亮色。','🌼','/images/guide-icons/44.png',9),
('plants','龙柏','教学区广场种植的观赏性乔木，枝叶繁茂，树形优美。常用于草坪或建筑物两侧成排列状分布。','🌲','/images/guide-icons/45.png',10),
('plants','榆叶梅','教学区广场周围种植的观赏性乔木，春季开花，花朵娇艳。为校园增添丰富的色彩层次。','🌸','/images/guide-icons/46.png',11),
('plants','桂花','生活区上层乔木之一，秋季开花，香气扑鼻。丹桂飘香时节，整个生活区都弥漫着甜蜜的香味。','🌼','/images/guide-icons/47.png',12),
('plants','丁香','生活区下层灌木，春季开花，紫色/白色花序优雅芬芳。与桂花、银杏等形成复层群落。','💜','/images/guide-icons/48.png',13),
('plants','白玉兰','春季花木树种，白色花朵洁白如玉。教学区配置烘托春色，开花时满树银花，蔚为壮观。','🤍','/images/guide-icons/49.png',14),
('plants','元宝枫','秋色叶树种，秋季叶片变红。与银杏搭配，金黄配火红，是校园秋天最绚烂的色彩组合。','🍁','/images/guide-icons/36.png',15),
('plants','国槐','中国传统园林树种，落叶乔木，树冠广卵形。示例市地处示例省，国槐是本地常见行道树和庭荫树。','🌳','/images/guide-icons/37.png',16),
('plants','杨树','北方常见树种，耐干旱性能好。树干纹路像眼睛的形状，春季飘柳絮也是校园一景。','🌳','/images/guide-icons/38.png',17),
('plants','石榴','夏季花木树种，花色火红艳丽。教学区配置的观赏植物，花开时节为校园增添热情。','🔴','/images/guide-icons/39.png',18),
('plants','常春藤','蔓生植物，沿校园建筑或篱笆生长，增加绿意和美感。生活区墙面立体绿化的主力。','🌱','/images/guide-icons/40.png',19),
('plants','爬山虎','蔓生植物，覆盖在教学楼墙面上，秋天叶子变红。整面墙的红色爬山虎是校园另一道风景线。','🌿','/images/guide-icons/41.png',20),

-- 任职评优 (28)
('awards','班长/团支书','班级核心干部，负责日常管理与团组织工作。锻炼领导力的第一站。','👑','/images/guide-icons/50.png',1),
('awards','班级委员','学习委员、生活委员、文体委员等班委职务，班级运转的中坚力量。','📋','/images/guide-icons/51.png',2),
('awards','校/院学生会干事','学生会活动部、宣传部等部门成员，校园活动的策划者与执行者。','🏢','/images/guide-icons/52.png',3),
('awards','学生会部长','学生会部长级，统筹部门工作与活动策划，学生组织的中层骨干。','📊','/images/guide-icons/53.png',4),
('awards','学生会主席团','经选拔产生，全面统筹学生会工作。学生组织的最高学生管理岗位。','⭐','/images/guide-icons/54.png',5),
('awards','团委干部','校/院团委组织部、宣传部等干部岗位，思想政治工作的核心力量。','🔴','/images/guide-icons/55.png',6),
('awards','社团负责人','65个社团社长/会长，社团文化节百余场活动的组织者。','🎪','/images/guide-icons/56.png',7),
('awards','社联干部','社团联合会成员，统筹管理全校社团事务。','🤝','/images/guide-icons/57.png',8),
('awards','志愿服务骨干','志愿服务组织骨干，「小青橙」志愿者协会的核心成员。','❤️','/images/guide-icons/58.png',9),
('awards','班委联席会代表','学院班委联席会成员，参与学生事务决策。','🗣️','/images/guide-icons/59.png',10),
('awards','宿舍长','宿舍负责人，管理宿舍日常事务。最小的「官」，最贴近生活的责任。','🏠','/images/guide-icons/60.png',11),
('awards','教学信息员','协助教务处收集教学反馈信息，学生与教务之间的桥梁。','📝','/images/guide-icons/61.png',12),
('awards','国家奖学金','8000元，教育部下达指标，大学期间最高荣誉。每一分钱都是实力的证明。','💰','/images/guide-icons/50.png',13),
('awards','国家励志奖学金','5000元，面向家庭经济困难优秀学生。逆境中的光芒，格外耀眼。','🌟','/images/guide-icons/51.png',14),
('awards','校长奖学金','3000元，比例仅1‰，素质测评专业第一优先。全校最稀缺的奖学金之一。','🎓','/images/guide-icons/52.png',15),
('awards','一等优秀学生奖学金','1500元，比例5%。每个专业前几名才能拿到，期末周的终极动力。','🥇','/images/guide-icons/53.png',16),
('awards','二等优秀学生奖学金','1000元，比例10%。优秀是一种习惯，这笔奖学金是最好的证明。','🥈','/images/guide-icons/54.png',17),
('awards','三等优秀学生奖学金','500元，比例15%。虽然金额不多，但也是对一学期努力的肯定。','🥉','/images/guide-icons/55.png',18),
('awards','特殊贡献奖学金','2000元，为学校做出突出贡献或赢得特殊荣誉。不是每个人都能拿，但拿了一定很酷。','🏆','/images/guide-icons/56.png',19),
('awards','企业奖学金','由合作企业设立的社会奖学金，不同专业有不同的企业赞助。','🏛️','/images/guide-icons/57.png',20),
('awards','省级奖学金','示例省政府奖学金等省级奖励，站在全省舞台上与优秀者同行。','⭐','/images/guide-icons/58.png',21),
('awards','三好学生标兵','获校长/一等奖学金者授予，「三好」中的最高荣誉。','🏅','/images/guide-icons/59.png',22),
('awards','三好学生','获二三等奖学金者授予，德智体全面发展的象征。','🎖️','/images/guide-icons/60.png',23),
('awards','优秀学生干部','素质测评优良的班团干部，比例不超过5%。既要学习好，又要工作好。','📈','/images/guide-icons/61.png',24),
('awards','优秀毕业生','校级/省级优秀毕业生称号，求职简历上最闪亮的一行。','🎓','/images/guide-icons/50.png',25),
('awards','自强之星','中国大学生自强之星，校已有3名同学获此殊荣。困境中不屈不挠的最好证明。','💪','/images/guide-icons/51.png',26),
('awards','徐芝纶力学奖','全国徐芝纶力学优秀学生奖，校首次获得。力学界的「奥斯卡」。','📐','/images/guide-icons/52.png',27),
('awards','基层就业卓越奖','毕业生基层就业卓越奖学金，校首次获得。到祖国最需要的地方去。','🏔️','/images/guide-icons/53.png',28),

-- 证书图鉴 (18)
('certificates','CET-4','大学英语四级，425分及以上通过。大学毕业的基本门槛，也是考研求职的标配。','📖','/images/guide-icons/62.png',1),
('certificates','CET-6','大学英语六级，425分及以上通过。比四级更难的挑战，简历上的加分项。','📕','/images/guide-icons/63.png',2),
('certificates','计算机二级','全国计算机等级考试二级。Office、C语言、Python……选一个你擅长的。','💻','/images/guide-icons/64.png',3),
('certificates','计算机三级','全国计算机等级考试三级。比二级更专业，技术党的进阶之路。','🖥️','/images/guide-icons/65.png',4),
('certificates','普通话等级','普通话水平测试，二级乙等及以上。想当老师的同学必考。','🗣️','/images/guide-icons/66.png',5),
('certificates','教师资格证','中小学教师资格考试合格证明。师范生和非师范生都可以考，多一条路多一个选择。','👩‍🏫','/images/guide-icons/67.png',6),
('certificates','注册测绘师','测绘工程专业对应执业资格。校园测绘专业的金字招牌。','📐','/images/guide-icons/68.png',7),
('certificates','建造师','一级/二级建造师，土木工程、工程管理专业。工地上的「通行证」。','🏗️','/images/guide-icons/69.png',8),
('certificates','土木工程师','注册土木工程师/结构工程师。校园土木工程专业的终极目标之一。','🏢','/images/guide-icons/62.png',9),
('certificates','水利水电工程师','水利水电工程专业对应执业资格。校园拥有水利工程博士学位授权点！','💧','/images/guide-icons/63.png',10),
('certificates','注册建筑师','一级/二级注册建筑师，建筑学专业。会画图会设计，还要会考试。','🏛️','/images/guide-icons/64.png',11),
('certificates','安全工程师','注册安全工程师，安全工程专业。安全生产的守护者。','🦺','/images/guide-icons/65.png',12),
('certificates','岩土工程师','注册岩土工程师，地质工程专业。跟石头打交道的最高认证。','🪨','/images/guide-icons/66.png',13),
('certificates','医师资格证','临床医学专业对应执业医师资格。校园医学院的学生，这条路上要走的路很长。','⚕️','/images/guide-icons/67.png',14),
('certificates','初级会计','会计学专业，初级会计职称。财会人职业生涯的第一步。','🧮','/images/guide-icons/68.png',15),
('certificates','银行从业','银行业专业人员职业资格考试。想进银行工作的敲门砖。','🏦','/images/guide-icons/69.png',16),
('certificates','软考证书','软件设计师、系统分析师等软考。程序员的技术认证阶梯。','⚡','/images/guide-icons/62.png',17),
('certificates','驾驶证','机动车驾驶证（C1/C2等）。大学期间最实用的证书之一，没之一。','🚗','/images/guide-icons/63.png',18),

-- 限定图鉴 (12)
('limited','银杏金黄大道（秋季限定）','每年10月下旬至11月中旬，银杏叶全部变黄，铺满整条道路。错过等一年，校园秋天最壮观的限时打卡点。','🍂','/images/guide-icons/70.png',1),
('limited','海棠花开（春季限定）','每年3-4月，教学区广场的海棠花竞相绽放。粉白花朵缀满枝头，花期短暂但惊艳，是春天的限定礼物。','🌺','/images/guide-icons/71.png',2),
('limited','景观湖芦苇荡（秋季限定）','秋天的景观湖芦苇随风飘摇，银白色芦花如雪。藏在芦苇丛后的小径很少有人经过，适合一个人散步发呆。','🌾','/images/guide-icons/00.png',3),
('limited','校园湖天鹅幼崽（春夏限定）','春夏季节，校园湖的黑白天鹅偶尔会繁育后代。毛茸茸的小天鹅跟在大天鹅身后学游泳，这是限定版治愈画面。','🦢','/images/guide-icons/01.png',4),
('limited','冬日雪景（冬季限定）','雪后的校园银装素裹，景观湖白雪披身，教学楼屋顶积雪如毯。北方校园的冬天虽冷，但雪景值得每一个南方同学尖叫。','❄️','/images/guide-icons/02.png',5),
('limited','迎春初绽（早春限定）','冬末春初，校园角落里的迎春花率先绽放。金黄色小花在寒风中摇曳，是校园一年中最早的一抹亮色。','🌼','/images/guide-icons/03.png',6),
('limited','期末图书馆排队（期末限定）','期末周清晨，图书馆门口排起长队，开馆瞬间百米冲刺。示例省最大图书馆的限定名场面，经历过的都懂。','🏃','/images/guide-icons/04.png',7),
('limited','桂花飘香（秋季限定）','秋天生活区的桂花盛开，空气里弥漫着甜蜜的香味。从桂花树下走过，衣服都会沾上淡淡的香气。','🌼','/images/guide-icons/05.png',8),
('limited','白玉兰满树（春季限定）','早春时节，教学区的白玉兰一夜间全部绽放。满树银花如鸽子停落枝头，纯净而短暂，一阵风雨便落满一地。','🤍','/images/guide-icons/06.png',9),
('limited','元宝枫红叶（深秋限定）','深秋的元宝枫叶片变红，与金黄的银杏交相辉映。一黄一红，是校园秋天最绚烂的色彩组合，持续不到两周。','🍁','/images/guide-icons/07.png',10),
('limited','新生军训（九月限定）','九月开学季，操场上迷彩方阵齐步走。口号声、军歌声回荡校园，是每个本校学生入学第一课的限定记忆。','🪖','/images/guide-icons/08.png',11),
('limited','毕业季跳蚤市场（六月限定）','六月毕业季，毕业生在宿舍楼下摆摊卖旧物。课本、台灯、收纳箱……每件物品都带着四年的故事。','🎓','/images/guide-icons/09.png',12);

-- ========================
-- 5. 成就赛道定义
-- ========================
INSERT INTO `achievement_tracks` (`track_key`, `name`, `theme`, `icon`, `icon_img`, `description`, `sort_order`) VALUES
('leadership','学生干部','leadership','👔','/images/guide-icons/12.png','学生组织任职经历',1),
('certificate','证书考证','certificate','📜','/images/guide-icons/62.png','各类资格证书认证',2),
('academic','学业成绩','academic','📚','/images/guide-icons/04.png','课程成绩与学业表现',3),
('competition','竞赛荣誉','competition','🏅','/images/guide-icons/52.png','学科竞赛获奖经历',4);

-- ========================
-- 6. 成就项定义
-- ========================
INSERT INTO `achievement_items` (`track_key`, `item_key`, `name`, `description`, `icon`, `sort_order`) VALUES
('leadership','class-leader','班长/团支书','班级核心干部，负责日常管理与团组织工作','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==',1),
('leadership','class-committee','班级委员','学习委员、生活委员、文体委员等班委职务','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+',2),
('leadership','student-union','校/院学生会干事','学生会活动部、宣传部等部门成员','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=',3),

('certificate','cet-4','CET-4','大学英语四级，425分及以上通过','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==',1),
('certificate','cet-6','CET-6','大学英语六级，425分及以上通过','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+',2),
('certificate','computer-level2','计算机二级','全国计算机等级考试二级','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=',3),

('academic','gpa-top10','综合测评前10%','素质综合测评优秀等级','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSIyLjUiIGZpbGw9IiNFNjdFMjIiIHN0cm9rZT0ibm9uZSIvPjxwYXRoIGQ9Ik0xMCAyMmwxNC0xMCAxNCAxMCIvPjwvc3ZnPg==',1),
('academic','gpa-top30','综合测评前30%','素质综合测评良好等级','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI5IiByPSIzIi8+PC9zdmc+',2),
('academic','scholarship-national','国家奖学金','8000元，教育部下达指标，最高荣誉','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==',3),

('competition','contest-school','校级竞赛','校级学科竞赛获奖','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+',1),
('competition','contest-province','省级竞赛','示例省赛区竞赛获奖','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=',2),
('competition','contest-national','国家级竞赛','全国总决赛获奖','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSIyLjUiIGZpbGw9IiNFNjdFMjIiIHN0cm9rZT0ibm9uZSIvPjxwYXRoIGQ9Ik0xMCAyMmwxNC0xMCAxNCAxMCIvPjwvc3ZnPg==',3);
