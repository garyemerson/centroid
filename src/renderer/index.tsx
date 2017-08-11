import React = require('react')
import ReactDOM = require('react-dom')
import Electron = require('electron')
import { format as urlFormat } from 'url'
import objectAssign = require("object-assign")
import native = require('../../native')
import fs = require('fs')
import Fuse = require('fuse.js')
import https = require('https')
import { Provider, connect } from 'react-redux'
import { createStore, applyMiddleware, compose, Action } from 'redux'
import logger = require("redux-logger")
import gmaps = require('gmaps')

native.init()

let resultList: any
let results = {}

// Get access to dialog boxes in our main UI process.
const remote = Electron.remote
const apiKeyFile = "api_key"
let apiKey: string | null = null
let citiesFile = "cities"
let globalCities = ["Tokyo, Japan", "Jakarta, Indonesia", "New York (NY), United States", "Seoul, South Korea", "Manila, Philippines", "Mumbai (Bombay), India", "Sao Paulo, Brazil", "Mexico City, Mexico", "Delhi, India", "Osaka, Japan", "Cairo, Egypt", "Kolkata (Calcutta), India", "Los Angeles (CA), United States", "Shanghai, China", "Moscow, Russia", "Beijing (Peking), China", "Buenos Aires, Argentina", "Guangzhou, China", "Shenzhen, China", "Istanbul, Turkey", "Rio de Janeiro, Brazil", "Paris, France", "Karachi, Pakistan", "Nagoya, Japan", "Chicago (IL), United States", "Lagos, Nigeria", "London, United Kingdom", "Bangkok, Thailand", "Kinshasa, Dem Rep of Congo", "Tehran, Iran", "Lima, Peru", "Dongguan, China", "Bogota, Colombia", "Chennai (Madras), India", "Dhaka, Bangladesh", "Essen, Germany", "Tianjin (Tientsin), China", "Hong Kong, China - Hong Kong", "Taipei, Taiwan (China ROC)", "Lahore, Pakistan", "Ho Chi Minh City (Saigon), Viet Nam", "Bangalore, India", "Hyderabad, India", "Johannesburg, South Africa", "Baghdad, Iraq", "Toronto, Canada", "Santiago, Chile", "Kuala Lumpur, Malaysia", "San Francisco (CA), United States", "Philadelphia (PA), United States", "Wuhan, China", "Miami (FL), United States", "Dallas (TX), United States", "Madrid, Spain", "Ahmedabad, India", "Boston (MA), United States", "Belo Horizonte, Brazil", "Khartoum, Sudan", "Saint Petersburg (Leningrad), Russia", "Shenyang, China", "Houston (TX), United States", "Pune, India", "Riyadh, Saudi Arabia", "Singapore, Singapore", "Washington (DC), United States", "Yangon, Myanmar", "Milan (Milano), Italy", "Atlanta (GA), United States", "Chongqing, China", "Alexandria, Egypt", "Nanjing (Nanking), China", "Guadalajara, Mexico", "Barcelona, Spain", "Chengdu, China", "Detroit (MI), United States", "Ankara, Turkey", "Athens, Greece", "Berlin, Germany", "Sydney, Australia", "Monterrey, Mexico", "Phoenix (AZ), United States", "Busan (Pusan), South Korea", "Recife, Brazil", "Bandung, Indonesia", "Porto Alegre, Brazil", "Melbourne, Australia", "Luanda, Angola", "Hangzhou (Hangchow), China", "Algiers, Algeria", "Xi'an (Sian), China", "Pyongyang, North Korea", "Qingdao (Tsingtao), China", "Surat, India", "Fortaleza, Brazil", "Durban, South Africa", "Kanpur, India", "Addis Ababa, Ethiopia", "Nairobi, Kenya", "Jeddah (Jiddah), Saudi Arabia", "Naples (Napoli), Italy", "Kabul, Afghanistan", "Salvador, Brazil", "Harbin (Haerbin), China", "Kano, Nigeria", "Casablanca (Dar-el-Beida), Morocco", "Cape Town, South Africa", "Curitiba, Brazil", "Surabaya, Indonesia", "San Diego (CA), United States", "Seattle (WA), United States", "Rome, Italy", "Dar es Salaam, Tanzania", "Taichung, China", "Jaipur, India", "Caracas, Venezuela", "Dakar, Senegal", "Kaohsiung, China", "Minneapolis (MN), United States", "Lucknow, India", "Amman, Jordan", "Tel Aviv-Yafo, Israel", "Guayaquil, Ecuador", "Kyiv (Kiev), Ukraine", "Faisalabad (Lyallpur), Pakistan", "Mashhad, Iran", "Izmir, Turkey", "Rawalpindi, Pakistan", "Tashkent, Uzbekistan", "Katowice, Poland", "Changchun, China", "Campinas, Brazil", "Daegu (Taegu), South Korea", "Changsha, China", "Nagpur, India", "San Juan, Philippines", "Aleppo, Syria", "Lisbon, Portugal", "Frankfurt am Main, Germany", "Nanchang, China", "Birmingham[], United Kingdom", "Tampa (FL), United States", "Medan, Indonesia", "Dalian, China", "Tunis, Tunisia", "Shijiazhuang, China", "Manchester, United Kingdom", "Port-AU-Prince, Haiti", "Damascus, Syria", "Ji'nan, China", "Fukuoka, Japan", "Santo Domingo, Dominican Republic", "Havana, Cuba", "Cali, Colombia", "Denver (CO), United States", "St. Louis (MO), United States", "Colombo, Brazil", "Dubai, United Arab Emirates", "Baltimore (MD), United States", "Sapporo, Japan", "Rotterdam, Netherlands", "Vancouver, Canada", "Preston, United Kingdom", "Patna, India", "Sana'A, Yemen", "Warsaw, Poland", "Bonn, Germany", "Accra, Ghana", "Bucharest, Romania", "Yokohama, Japan", "Kunming, China", "Guiyang, China", "Zibo, China", "Incheon, South Korea", "Zhengzhou, China", "Taiyuan, China", "Chaoyang (Guangdong), China", "Brasilia, Brazil", "Zhongshan, China", "West Midlands, United Kingdom", "Giza, Egypt", "Quezon City, Philippines", "Nanhai, China", "Fuzhou (Fujian), China", "Lanzhou, China", "Xiamen, China", "Chittagong, Bangladesh", "Zaozhuang, China", "Jilin, China", "Linyi, China", "Wenzhou, China", "Stockholm, Sweden", "Puebla de Zaragoza, Mexico", "Puning, China", "Baku, Azerbaijan", "Ibadan, Nigeria", "Brisbane, Australia", "Minsk, Belarus", "Sikasso, Mali", "Nanchong, China", "Nanning, China", "Urumqi, China", "Yantai, China", "Fuyang (Zhejiang), China", "Tangshan, China", "Maracaibo, Venezuela", "Hamburg, Germany", "Budapest, Hungary", "Shunde, China", "Manaus, Brazil", "Xuzhou, China", "Baotou, China", "Hefei, China", "Vienna, Austria", "Indore, India", "Asuncion, Paraguay", "Tianmen, China", "Belgrade, Serbia", "Suzhou (Anhui), China", "Suizhou, China", "Nanyang, China", "Nakuru, Kenya", "Koulikoro, Mali", "Ningbo, China", "Liuan, China", "Anshan, China", "Tengzhou, China", "Qiqihaer, China", "Pizhou, China", "Taian, China", "Datong, China", "Kobe, Japan", "Hama, Syria", "Esfahan, Iran", "Tripoli, Libya", "West Yorkshire, United Kingdom", "Vadodara, India", "Taizhou (Zhejiang), China", "Luoyang, China", "Quito, Ecuador", "Jinjiang, China", "Mopti, Mali", "Perth, Australia", "Daejeon (Taejon), South Korea", "Kyoto, Japan", "Xiantao, China", "Tangerang, Indonesia", "Bhopal, India", "Coimbatore, India", "Kharkiv, Ukraine", "Gwangju (Kwangchu), South Korea", "Xinghua, China", "Harare, Zimbabwe", "Fushun, China", "Shangqiu, China", "Wuxi, China", "Hechuan, China", "Wujin, China", "Guigang, China", "Jianyang (Sichuan), China", "Huhehaote, China", "Santa Cruz, Bolivia", "Semarang, Indonesia", "Ludhiana, India", "Novosibirsk, Russia", "Neijiang, China", "Maputo, Mozambique", "Nan'an, China", "Douala, Cameroon", "Weifang, China", "Daqing, China", "Kayes, Mali", "Tongzhou, China", "Tabriz, Iran", "Homs, Syria", "Rugao, China", "Guiping, China", "Huainan, China", "Kochi, India", "Suining, China", "Bozhou, China", "Zhanjiang, China", "Changde, China", "Montevideo, Uruguay", "Suzhou (Jiangsu), China", "Xintai, China", "Ekaterinoburg, Russia", "Handan, China", "Visakhapatnam, India", "Kawasaki, Japan", "Jiangjin, China", "Pingdu, China", "Agra, India", "Jiangyin, China", "Tijuana, Mexico", "Liuyang, China", "Bursa, Turkey", "Al-Hasakeh, Syria", "Makkah, Saudi Arabia", "Yaounde, Cameroon", "Xuanwei, China", "Dengzhou, China", "Palembang, Indonesia", "Nizhny Novgorod, Russia", "Guarulhos, Brazil", "Heze, China", "Auckland, New Zealand", "Omdurman, Sudan", "Shantou, China", "Leizhou, China", "Yongcheng, China", "Valencia, Venezuela", "Thane, India", "San Antonio (TX), United States", "Xinyang, China", "Luzhou, China", "Almaty, Kazakhstan", "Changshu, China", "Taixing, China", "Phnom Penh, Cambodia", "Laiwu, China", "Xiaoshan, China", "Yiyang, China", "Liuzhou, China", "Gaozhou, China", "Fengcheng (Jiangxi), China", "Cixi, China", "Karaj, Iran", "Mogadishu, Somalia", "Varanasi, India", "Kampala, Uganda", "Ruian, China", "Lianjiang, China", "Huaian, China", "Shiraz, Iran", "Multan, Pakistan", "Madurai, India", "Kalyan, India", "Quanzhou, China", "Adana, Turkey", "Bazhong, China", "Ouagadougou, Burkina Faso", "Haicheng, China", "Xishan, China", "Leiyang, China", "Caloocan, Philippines", "Kalookan (Caloocan), Philippines", "Jingzhou, China", "Saitama, Japan", "Prague, Czech Republic", "Fuqing, China", "Kumasi, Ghana", "Meerut, India", "Hyderabad, Pakistan", "Lufeng, China", "Dongtai, China", "Yixing, China", "Mianyang, China", "Wenling, China", "Leqing, China", "Ottawa, Canada", "Yushu, China", "Barranquilla, Colombia", "Hiroshima, Japan", "Chifeng, China", "Nashik, India", "Makasar (Ujung Pandang), Indonesia", "Sofia, Bulgaria", "Rizhao, China", "Davao, Philippines", "Tianshui, China", "Huzhou, China", "Samara (Samarskaya oblast), Russia", "Omsk, Russia", "Gujranwala, Pakistan", "Adelaide, Australia", "Macheng, China", "Wuxian, China", "Bijie, China", "Yuzhou, China", "Leshan, China", "La Matanza, Argentina", "Rosario, Argentina", "Jabalpur, India", "Kazan, Russia", "Jimo, China", "Dingzhou, China", "Calgary, Canada", "Yerevan, Armenia", "El-Jadida, Morocco", "Jamshedpur, India", "Zoucheng, China", "Pikine-Guediawaye, Senegal", "Anqiu, China", "Guang'an, China", "Chelyabinsk, Russia", "Conakry, Guinea", "Asansol, India", "Shouguang, China", "Changzhou, China", "Ulsan, South Korea", "Zhuji, China", "Toluca (de Lerdo), Mexico", "Marrakech, Morocco", "Dhanbad, India", "Tbilisi, Georgia", "Hanchuan, China", "Lusaka, Zambia", "Qidong, China", "Faridabad, India", "Zaoyang, China", "Zhucheng, China", "Rostov-na-Donu, Russia", "Jiangdu, China", "Xiangcheng, China", "Zigong, China", "Jining (Shandong), China", "Edmonton, Canada", "Allahabad, India", "Beiliu, China", "Dnipropetrovsk, Ukraine", "Gongzhuling, China", "Qinzhou, China", "Ufa, Russia", "Sendai, Japan", "Volgograd, Russia", "Ezhou, China", "Guatemala City, Guatemala", "Zhongxiang, China", "Amsterdam, Netherlands", "Brussels, Belgium", "Bamako, Mali", "Ziyang, China", "Antananarivo, Madagascar", "Mudanjiang, China", "Amritsar, India", "Vijayawada, India", "Haora (Howrah), India", "Donetsk (Donestskaya oblast), Ukraine", "Huazhou, China", "Fuzhou (Jiangxi), China", "Pimpri Chinchwad, India", "Dublin, Ireland", "Rajkot, India", "Lianyuan, China", "Liupanshui, China", "Kaduna, Nigeria", "Kitakyushu, Japan", "Qianjiang, China", "Perm, Russia", "Odessa, Ukraine", "Qom, Iran", "Yongchuan, China", "Peshawar, Pakistan", "Linzhou, China", "Benxi, China", "Ulaanbaatar, Mongolia", "Zhangqiu, China", "Yongzhou, China", "Srinagar, India", "Ghaziabad, India", "Xinyi (Jiangsu), China", "Zhangjiagang, China", "Wafangdian, China", "Xianyang, China", "Liaocheng, China", "Ahwaz, Iran", "Taishan, China", "Linhai, China", "Feicheng, China", "Suwon (Puwan), South Korea", "Wuwei, China", "Haimen, China", "Liling, China", "Xinhui, China", "Gaziantep, Turkey", "Krasnoyarsk, Russia", "Chiba, Japan", "Voronezh, Russia", "Durg-Bhilai Nagar, India", "Ruzhou, China", "Yichun (Jiangxi), China", "Al-Madinah, Saudi Arabia", "Yulin (Guangxi), China", "Seongnam, South Korea", "Yueyang, China", "Yiwu, China", "San Jose (CA), United States", "Jixi, China", "Managua, Nicaragua", "Xinyi (Guangdong), China", "Safi, Morocco", "Guangyuan, China", "Soweto, South Africa", "Zhangjiakou, China", "Baoding, China", "Cartagena, Colombia", "Huludao, China", "Pingdingshan, China", "Torino, Italy", "Zengcheng, China", "Laiyang, China", "Qingzhou, China", "Aurangabad, India", "Lattakia, Syria", "Laizhou, China", "Thiruvananthapuram, India", "Weinan, China", "Wuchang, China", "Guangshui, China", "Gaizhou, China", "Xiaogan, China", "Jiaxing, China", "Kozhikode, India", "Zhuzhou, China", "Tyneside, United Kingdom", "Hengyang, China", "Dehui, China", "Honghu, China", "Danyang, China", "Daye, China", "Solapur, India", "Xingning, China", "Xiangfan, China", "Shubra-El-Khema, Egypt", "Luoding, China", "Gwalior, India", "Ranchi, India", "Huiyang, China", "Mombasa, Kenya", "Jinzhou (Liaoning), China", "Jiangyan, China", "Chenghai, China", "Jiamusi, China", "Songzi, China", "Tegucigalpa, Honduras", "Wujiang, China", "Jodhpur, India", "Duque de Caxias, Brazil", "Xi'ning, China", "Yuyao, China", "Hezhou, China", "Jiangyou, China", "Tiruchchirappalli, India", "Baoshan, China", "Saratov, Russia", "Ankang, China", "Gaomi, China", "Yangchun, China", "Santiago de los Caballeros, Dominican Republic", "Danzhou, China", "LA PAZ, Bolivia", "Zhuanghe, China", "Zhuhai, China", "Zhaodong, China", "Sakai, Japan", "Haikou, China", "Jiaonan, China", "El Alto, Bolivia", "Xuancheng, China", "Wuchuan, China", "Yuhang, China", "Qinhuangdao, China", "Bogor, Indonesia", "Kermanshah, Iran", "Longhai, China", "Liverpool, United Kingdom", "Yanshi, China", "Guwahati, India", "Yichun (Heilongjiang), China", "Konya, Turkey", "Barquisimeto, Venezuela", "Yingde, China", "Bengbu, China", "Yibin, China", "Chandigarh, India", "Xiangxiang, China", "Yinchuan, China", "Valencia, Spain", "Guilin, China", "Hamamatsu, Japan", "Sao Bernardo do Campo, Brazil", "Deir El-Zor, Syria", "Bishkek, Kyrgyzstan", "Teresina, Brazil", "Suihua, China", "Benghazi, Libya", "Jiutai, China", "Meishan, China", "Zaporizhya, Ukraine", "Gaoyou, China", "Marseille, France", "Kaifeng, China", "Changning, China", "Tongliao, China", "Natal, Brazil", "Bandar Lampung, Indonesia", "Dongying, China", "Gaoan, China", "Langzhong, China", "Lichuan, China", "Hubli-Dharwad, India", "Mysore, India", "Niigata, Japan", "Indianapolis (IN), United States", "Jiaozhou, China", "Pingxiang (Jiangxi), China", "Haiphong, Viet Nam", "Arequipa, Peru", "Jacksonville (FL), United States", "Tanger, Morocco", "Dandong, China", "Kishinev, Moldova", "Krasnodar, Russia", "Zagreb, Croatia", "Xinmi, China", "Chaohu, China", "Xinyu, China", "Gongyi, China", "Huixian, China", "Xinxiang, China", "Port Elizabeth, South Africa", "Mendoza, Argentina", "Nantong, China", "Pengzhou, China", "Khulna, Bangladesh", "Malang, Indonesia", "Padang, Indonesia", "Anyang, China", "Renqiu, China", "Foshan, China", "Anshun, China", "Chihuahua, Mexico", "Campo Grande, Brazil", "Goyang, South Korea", "Benin City, Nigeria", "Bucheon (Puchon), South Korea", "Gaocheng, China", "Pulandian, China", "Hejian, China", "Dafeng, China", "Enshi, China", "Dongyang, China", "Lviv, Ukraine", "Kunshan, China", "Shuangcheng, China", "Salem, India", "Jiaozuo, China", "Ad-Dammam, Saudi Arabia", "Huaibei, China", "Liyang, China", "Samut Prakan, Thailand", "Rongcheng, China", "Cenxi, China", "Nampho, North Korea", "Columbus (OH), United States", "Bareilly, India", "Leping, China", "Laixi, China", "Liaoyang, China", "Zhaotong, China", "Jerusalem, Israel", "Tainan, China", "Cuernavaca, Mexico", "Riga, Latvia", "Linfen, China", "Lingbao, China", "Shangyu, China", "Wuan, China", "Hailun, China", "Xingyi, China", "Wuxue, China", "Cebu, Philippines", "Aguascalientes, Mexico", "Tolyatti, Russia", "Hamilton, Canada", "Zhoushan, China", "Langfang, China", "Osasco, Brazil", "Nonthaburi, Thailand", "Dashiqiao, China", "Tongxiang, China", "Yichang, China", "Yangzhou, China", "Blantyre City, Malawi", "Hamhung, North Korea", "Jalandhar, India", "Al-Rakka, Syria", "Niamey, Niger", "Xiangtan, China", "Winnipeg, Canada", "Oran (Wahran), Algeria", "Kota, India", "Sevilla, Spain", "Navi Mumbai (New Bombay), India", "Port Harcourt, Nigeria", "Saltillo, Mexico", "Khartoum North, Sudan", "Shizuoka, Japan", "Yuanjiang, China", "Raipur, India", "Kryviy Rig, Ukraine", "Yingkou, China", "Wuhu, China", "Zhenjiang, China", "Nankang, China", "Wugang (Hunan), China", "Hegang, China", "Linqing, China", "Pretoria, South Africa", "Zunyi, China", "Panzhihua, China", "Austin (TX), United States", "Changle, China", "Lianyungang, China", "Yancheng, China", "Zunhua, China", "Changyi, China", "Qiongshan, China", "Bulawayo, Zimbabwe", "Wendeng, China", "Okayama, Japan", "Rabat, Morocco", "Pakanbaru, Indonesia", "Nehe, China", "Memphis (TN), United States", "Joao Pessoa, Brazil", "Kathmandu, Nepal", "Longkou, China", "Shengzhou, China", "Antalya, Turkey", "Kumamoto, Japan", "Lilongwe, Malawi", "Mexicali, Mexico", "Kaiping, China", "Palermo, Italy", "Aligarh, India", "Nottingham, United Kingdom", "Haining, China", "Mosul, Iraq", "Hermosillo, Mexico", "Tongcheng, China", "Shulan, China", "Miluo, China", "Bhubaneswar, India", "Yangquan, China", "Chenzhou, China", "Haiyang, China", "Morelia, Mexico", "Huangshi (Hubei), China", "Xinmin, China", "Barnaul, Russia", "Qixia, China", "Jaboatao dos Guarapes, Brazil", "Chongzhou, China", "Cotonou, Benin", "Yingcheng, China", "Zaragoza, Spain", "Changzhi, China", "Qujing, China", "Linghai, China", "Changge, China", "Trujillo, Peru", "Tampico, Mexico", "Maoming, China", "La Plata, Argentina", "Ciudad Guayana, Venezuela", "Moradabad, India", "Jieshou, China", "Sheffield, United Kingdom", "Donggang, China", "Jingjiang, China", "Acheng, China", "Veracruz, Mexico", "Ulyanovsk, Russia", "Wroclaw, Poland", "Jieyang, China", "Shaoxing, China", "Qian'an, China", "Nanchuan, China", "Qionglai, China", "Deyang, China", "Sagamihara, Japan", "Fuyang (Anhui), China", "Fuxin, China", "Jiyuan, China", "Puente Alto, Chile", "Qufu, China", "Gaoyao, China", "Gorakhpur, India", "Fort Worth (TX), United States", "Xinji, China", "Dujiangyan, China", "The Hague, Netherlands", "Bhiwandi, India", "Lingyuan, China", "Xingyang, China", "Maiduguri, Nigeria", "Genova, Italy", "Meihekou, China", "Izhevsk, Russia", "Jeonju (Chonchu), South Korea", "Leling, China", "Xichang, China", "Colombo, Sri Lanka", "Zaria, Nigeria", "Anlu, China", "Charlotte (NC), United States", "Yizheng, China", "Weihai, China", "Xinzheng, China", "Dengfeng, China", "Vladivostok, Russia", "Shaoyang, China", "Taizhou (Jiangsu), China", "Jammu, India", "Lanxi, China", "Yuncheng, China", "Kagoshima, Japan", "Yaroslave, Russia", "Contagem, Brazil", "Shishou, China", "Panjin, China", "Zamboanga, Philippines", "Orumiyeh, Iran", "Binzhou, China", "Kisumu, Kenya", "Baoji, China", "El Paso (TX), United States", "Yunzhou, China", "Diyarbakir, Turkey", "Jurong, China", "Zhaoyuan, China", "Huizhou, China", "Tianchang, China", "Dortmund, Germany", "Shihezi, China", "Shiyan, China", "Cuttack, India", "Cochabamba, Bolivia", "Cheongju, South Korea", "Jingmen, China", "Shangzhi, China", "Anqing, China", "Chongjin, North Korea", "Stuttgart, Germany", "Rushan, China", "Kingston, Jamaica", "Milwaukee (WI), United States", "Sorocaba, Brazil", "Glasgow, United Kingdom", "Khabarovsk, Russia", "Guanghan, China", "Warangal, India", "Irkutsk, Russia", "Tyumen, Russia", "Lomas de Zamora, Argentina", "Beipiao, China", "Funabashi, Japan", "Mingguang, China", "Shenzhou, China", "Zhangzhou, China", "Xianning, China", "Maanshan, China", "Bandjarmasin, Indonesia", "Callao, Peru", "Poznan, Poland", "Kayseri, Turkey", "Chon Buri, Thailand", "Quetta, Pakistan", "Shuozhou, China", "Samarinda, Indonesia", "Helsinki, Finland", "Akesu, China", "Novokuznetsk, Russia", "Fengcheng (Liaoning), China", "Hachioji, Japan", "Beihai, China", "Jamnagar, India", "Nouakchott, Mauritania", "Bazhou, China", "Yongkang, China", "Louisville (KY), United States", "Chizhou, China", "Huaiyin, China", "Fuan, China", "Bhilai Nagar, India", "Dezhou, China", "Makhachkala, Russia", "Xingping, China", "Jiujiang, China", "Bristol, United Kingdom", "Botou, China", "Fengnan, China", "Astana, Kazakhstan", "Yizhou, China", "Amravati, India", "Nashville-Davidson (TN), United States", "Batam, Indonesia", "Orenburg, Russia", "Zhuozhou, China", "Las Vegas (NV), United States", "Cancun, Mexico", "Longyan, China", "Oslo, Norway", "Tiruppur, India", "Vilnius, Lithuania", "Bremen, Germany", "Gold Coast-Tweed, Australia", "Gaobeidian, China", "Mangalore, India", "Songyuan, China", "Yangjiang, China", "Wanyuan, China", "Jiangmen, China", "Xingtai, China", "Shaoguan, China", "Feira de Santana, Brazil", "Guixi, China", "Ruijin, China", "Zahedan, Iran", "Jinzhong, China", "Portland (OR), United States", "Jintan, China", "Reynosa, Mexico", "Ilorin, Nigeria", "Oklahoma City (OK), United States", "Nakhon Ratchasima, Thailand", "N'Djamena, Chad", "Shangzhou, China", "Panshi, China", "Kerman, Iran", "Kaiyuan (Liaoning), China", "Islamabad, Pakistan", "Sarajevo, Bosnia and Herzegovina", "Bikaner, India", "Dushanbe, Tajikistan", "Vientiane, Laos", "Dehradun, India", "Zhangshu, China", "Beining, China", "ABU Dhabi, United Arab Emirates", "Shimkent, Kazakhstan", "Xingcheng, China", "Imbaba, Egypt", "Yicheng, China", "Skoplje, Macedonia", "Kadhimain, Iraq", "At-Ta'if, Saudi Arabia", "Dali, China", "Fuding, China", "Jinzhou (Hebei), China", "Renhuai, China", "Mira-Bhayandar, India", "Kemerovo, Russia", "Duisburg, Germany", "Rasht, Iran"]

class CitySelection extends React.Component<any, any> {
  constructor() {
    super()
  }

  style: React.CSSProperties = {
    paddingTop: "3vh",      
    height: "35vh",
    background: "#efefef",
    overflowX: "scroll",
  }
  previewBarStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    marginTop: "39px",
    textAlign: "center",
  }

  render () {
    let previews: JSX.Element[] = []
    for (let i = 0; i < this.props.cities.length; i++) {
      previews.push(<Preview dispatch={this.props.dispatch} key={i} cities={this.props.cities} city={this.props.cities[i].name}
        lat={this.props.cities[i].lat} lon={this.props.cities[i].lon} index={i}/>)
    }

    return (
      <div style={this.style}>
        <div>
          <Search dispatch={this.props.dispatch}/>
        </div>
        <div style={this.previewBarStyle}>
          {previews}
        </div>
      </div>
     )
  }
}

class Preview extends React.Component<any, any> {
  constructor(props: any) {
    super(props)
    let cityEscaped = this.props.city.replace(/, /g , ",").replace(/ /g, "+")

    if (apiKey === null) {
      apiKey = "AIzaSyDZm6wg5jUbhVEYzOjrlKMmGFHxpp5chrc"
    }
    this.state = {
      city: this.props.city,
      imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ cityEscaped + 
        "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
        "&markers=color:red%7C" + cityEscaped + 
        "&key=" + apiKey,
      lat: this.props.lat,
      lon: this.props.lon,
    }
    this.getLatLon(cityEscaped, apiKey)
  }

  style: React.CSSProperties = {
    height: "20vh",
    display: "inline-block",
    margin: "0 10px 10px 10px",
    textAlign: "center",
    fontFamily: "monospace",
    fontSize: "12px",
  }
  imgStyle: React.CSSProperties = {
    height: "15vh",
    width: "25vh",
    background: "#aacbff",
    border: "1px solid #d0d0d0",
    borderRadius: "3px",
    boxShadow: "0 0 10px 2.5px rgba(0, 0, 0, 0.05)",
  }
  buttonStyle: React.CSSProperties = {
    position: "relative",
    top:" 25px",
    zIndex: 1,
    overflow: "visible",
    marginTop: "-24px",
    float: "right",
    fontWeight: "bolder",
    padding:" 0",
    boxShadow: "inset 0 0 10px #bbb5b5",
    border: "1px solid #ddd",
    opacity: 0.9,
    color: "#333",
    right: "10px",
    height: "17px",
    width: "17px",
    fontSize: "12px",
    paddingLeft: "0.75px",
    borderRadius: "50%",
    textAlign: "center",
    outlineStyle: "none",
  }
  imgButtonContainer: React.CSSProperties = {
    display: "table",
  }

  getLatLon(city: string, apiKey: string) {
    city = city.trim()
    console.log("city is '" + city + "'")
    console.log("city encoded is '" + encodeURIComponent(city) + "'")
    console.log("apiKey is '" + apiKey + "'")
    let requestPath = "/maps/api/geocode/json?address=" + city + "&key=" + apiKey

    const options = {
      hostname: 'maps.googleapis.com',
      port: 443,
      path: requestPath,
      method: 'GET',
    };

    const req = https.request(options, (resp) => {
      let fullResponse = ""
      console.log(`STATUS: ${resp.statusCode}`);
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => {
        fullResponse += chunk
      });
      resp.on('end', () => {
        let obj = JSON.parse(fullResponse)
        let loc = obj.results[0].geometry.location
        console.log(loc)
        this.props.dispatch({
          type: "ADD_LATLON_INFO",
          index: this.props.index,
          lat: loc.lat,
          lon: loc.lng,
        })
      })
    })

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`)
    })

    req.end()
    console.log("making request with path " + requestPath)
  }

  RemoveCity() {
    this.props.dispatch({
      type: "REMOVE_CITY",
      index: this.props.index
    })
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.city !== this.props.city) {
      let cityEscaped = nextProps.city.replace(/, /g , ",").replace(/ /g, "+")
      this.setState({
        city: nextProps.city,
        imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ cityEscaped + 
          "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" +
          "&scale=2" + "&markers=color:red%7C" + cityEscaped + "&key=" + apiKey,
      })
    }
    if (nextProps.lat !== this.props.lat || nextProps.lon !== this.props.lon) {
      this.setState({
        lat: nextProps.lat,
        lon: nextProps.lon,
      })
    }
  }

  render () {
    let latLonStr = "-"
    if (this.state.lat !== null) {
      latLonStr = "(" + this.state.lat + ", " + this.state.lon + ")"
    }

    let buttonHoverStyle = <style>{"#removeButton:hover {background-color: #ff6868}"}</style>
    return (
      <div style={this.style}>
        <p style={{marginBottom: "0"}}>{this.state.city}</p>
        <p style={{marginTop: "0", marginBottom: "2px",}}>{latLonStr}</p>
        <div style={this.imgButtonContainer}>
          {buttonHoverStyle}
          <button id="removeButton" style={this.buttonStyle} onClick={this.RemoveCity.bind(this)}>✕</button>
          <img style={this.imgStyle} src={this.state.imgUrl}/>
        </div>
      </div>
    )
  }
}

class Search extends React.Component<any, any> {
  constructor(props: any) {
    super(props)

    let options = {
      shouldSort: true,
      includeMatches: true,
      threshold: 0.6,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
    }

    this.focusTextInput = this.focusTextInput.bind(this)
    let allCities = globalCities
    this.state = {
      inputText: "",
      matches: [] as string[],
      matchIndices: [] as number[],
      allCities: allCities,
      fz: new Fuse(allCities, options),
      resultsVisible: false,
      focused: false,
      selectedResult: -1,
      scrollTop: 0,
      needsScroll: false,
    }

    Electron.ipcRenderer.on('toggle-search', (event) => {
      // console.log(message)  // Prints 'whoooooooh!'
      this.focusTextInput()
    })
  }

  textInput: any
  resultList: any
  style: React.CSSProperties = {
    display: "table",
    position: "absolute",
    left: "calc(50% - 10em)",
    margin: "0 auto 10px auto",
    borderRadius: "3px",
  }
  inputStyle: React.CSSProperties = {
    width: "20em",
    fontFamily: "sans-serif",
    fontSize: "16px",
    outline: "none",
    position: "relative",
    zIndex: 2,
    padding: "5px 3px",
    border: "1px solid #ddd",
    borderRadius: "3px",
  }

  focusTextInput() {
    this.textInput.focus()
    if (this.state.inputText !== "") {
      this.textInput.select()
    }
  }

  handleFocus() {
    // console.log("focus")
    this.setState({
      focused: true,
      needsScroll: true,
    })
  }

  componentDidUpdate() {
    // if (this.state.needsScroll) {
    //   if (resultList !== undefined && resultList !== null) {
    //     console.log("restoring scrollTop to " + this.state.scrollTop)
    //     resultList.scrollTop = this.state.scrollTop
    //   } else {
    //     console.log("bad resultList: " + resultList)
    //   }
    //   this.setState({
    //     needsScroll: false
    //   })
    // }
  }

  handleBlur() {
    // console.log("blur")
    this.setState({
      focused: false,
    })
  }

  updateScrollTop(x: number) {
    this.setState({
      scrollTop: x
    })
  }

  handleChange(event: any) {
    console.log("change event triggered with key '%s'", event.target.value)
    this.setState({
      inputText: event.target.value
    })

    if (event.target.value !== "") {
      let results = this.state.fz.search(event.target.value)
      let numToKeep = Math.min(results.length, 20)
      results = results.slice(0, numToKeep)

      let newMatches: string[] = []
      let newMatchIndices: number[][] = []
      for (let i = 0; i < results.length; i++) {
        newMatches.push(this.state.allCities[results[i].item])
        newMatchIndices.push(results[i].matches[0])
      }
      
      this.setState({
        matches: newMatches,
        matchIndices: newMatchIndices,
        selectedResult: 0,
        scrollTop: 0,
        needsScroll: false,
      })
    } else {
      this.setState({
        matches: [],
        matchIndices: [],
      })
    }
  }

  handleKeyPress(event: any) {
    switch (event.keyCode) {
      case 13: // Enter
        event.preventDefault()
        this.textInput.blur()
        this.props.dispatch({type: "ADD_CITY", name: this.state.matches[this.state.selectedResult]})
        break
      case 27: // Escape
        event.preventDefault()
        this.textInput.blur()
        break
      case 38: // Up
        event.preventDefault()
        if (this.state.selectedResult > 0) {
          // console.log("result offsetTop is " + results[this.state.selectedResult - 1].offsetTop)
          // console.log("resultList scrollTop is " + resultList.scrollTop)

          // if (results[this.state.selectedResult - 1].offsetTop < resultList.scrollTop) {
          //   console.log("resultList scrollTop before: " + resultList.scrollTop)
          //   results[this.state.selectedResult - 1].scrollIntoView()
          //   console.log("resultList scrollTop after: " + resultList.scrollTop)
          //   console.log("resultList height is " + resultList.offsetHeight)
          // }

          this.setState({
            selectedResult: this.state.selectedResult - 1,
            // scrollTop: resultList.scrollTop,
          })
        }
        break
      case 40: // Down
        event.preventDefault()
        if (this.state.selectedResult < this.state.matches.length - 1) {
          // console.log("result offsetTop is " + results[this.state.selectedResult + 1].offsetTop)
          // console.log("resultList scrollTop is " + resultList.scrollTop)
          // let resultBottom = results[this.state.selectedResult + 1].offsetTop + results[this.state.selectedResult + 1].offsetHeight
          // let resultListBottom = resultList.scrollTop + resultList.offsetHeight
          // console.log("result bottom is " + resultBottom)
          // console.log("resultList bottom is " + resultListBottom)
          // if (resultBottom > resultListBottom) {
          //   console.log("resultList scrollTop before: " + resultList.scrollTop)
          //   results[this.state.selectedResult + 1].scrollIntoView(false)
          //   console.log("resultList scrollTop after: " + resultList.scrollTop)
          // }
          this.setState({
            selectedResult: this.state.selectedResult + 1,
            // scrollTop: resultList.scrollTop,
          })
        }
        break
      default:
        break
    }
  }

  render() {
    let results: JSX.Element | null = null
    let style = this.style
    let inputStyle = this.inputStyle
    if (this.state.focused) {
      style = objectAssign({}, this.style, {boxShadow: "0 0 40px 5px rgba(0, 0, 0, 0.125)"})
      if (this.state.matches.length > 0) {
        inputStyle = objectAssign({}, this.inputStyle, {borderRadius: "3px 3px 0 0"})
        results = <Results dispatch={this.props.dispatch} ref={(results) => this.resultList = results} matches={this.state.matches}
          matchIndices={this.state.matchIndices} selectedIndex={this.state.selectedResult} scrollTop={this.state.scrollTop}
          UpdateScrollTop={this.updateScrollTop.bind(this)}/>
      }
    }

    return (
      <div id="search" style={style}>
        <style>
          {"#input::-webkit-input-placeholder { font-style: italic; }" +
           "#input:-moz-placeholder { font-style: italic; }" +
           "#input::-moz-placeholder { font-style: italic; }" +
           "#input:-ms-input-placeholder { font-style: italic; }"}
        </style>
        <input id="input" value={this.state.inputText} style={inputStyle} type="text" name="city"
          placeholder={"Search City " + (process.platform === 'darwin' ? '(cmd+L)' : '(ctrl+L)')}
          onFocus={this.handleFocus.bind(this)}
          onBlur={this.handleBlur.bind(this)} onChange={this.handleChange.bind(this)}
          ref={(input) => { this.textInput = input }} onKeyDown={this.handleKeyPress.bind(this)}/>
        {results}
      </div>
    )
  }
}

class Results extends React.Component<any, any> {
  constructor(props: any) {
    super(props)

    this.state = {
      scrollTop: 0,
    }
  }

  ul: any
  lis = {}
  style = {
    borderRadius: "0 0 3px 3px",
    border: "1px solid #ddd",
    position: "relative",
    zIndex: 2,
  }
  ulStyle = {
    borderRadius: "0 0 3px 3px",
    color: "#444",
    backgroundColor: "#f7f7f7",
    listStyleType: "none",
    margin: 0,
    padding: 0,
    overflowY: "scroll",
    maxHeight: "240px",
    width: "318px",
    position: "relative",
    zIndex: 2,
  }
  liStyle = {
    fontFamily: "sans-serif",
    borderBottom: "1px solid #ddd",
    padding: "3px",
    cursor: "pointer",
    position: "relative",
    zIndex: 2,
  }
  matchStyle = {
    color: "#f2c12e",
  }

  getHighlightedSpans(i: number): JSX.Element[] {
    let indices = this.props.matchIndices[i].indices
    let spans: JSX.Element[] = []
    let curr = 0
    for (let j = 0; j < indices.length; j++) {
      if (curr !== indices[j][0]) {
        let substr = this.props.matches[i].substring(curr, indices[j][0])
        spans.push(<span>{substr}</span>)
        curr = indices[j][0]
      }
      let substr = this.props.matches[i].substring(indices[j][0], indices[j][1] + 1)
      spans.push(<span style={this.matchStyle}>{substr}</span>)
      curr = indices[j][1] + 1
    }
    if (curr !== this.props.matches[i].length) {
      let substr = this.props.matches[i].substring(curr, this.props.matches[i].length)
      spans.push(<span>{substr}</span>)
    }

    return spans
  }

  getAddCityFn(city: string) {
    return function(e: any) {
      // e.preventDefault()
      this.props.dispatch({type: "ADD_CITY", name: city})
    }.bind(this)
  }

  componentDidUpdate() {
    let selectedTop = this.lis[this.props.selectedIndex].offsetTop
    let listTop = this.ul.scrollTop
    let selectedBottom = selectedTop + this.lis[this.props.selectedIndex].offsetHeight
    let listBottom = listTop + this.ul.offsetHeight
    // console.log("selectedTop: " + selectedTop + "; listTop: " + listTop)
    // console.log("selectedBottom: " + selectedBottom + "; listBottom: " + listBottom)

    if (selectedBottom > listBottom) {
      // console.log("this.ul.scrollTop before: " + this.ul.scrollTop)
      this.lis[this.props.selectedIndex].scrollIntoView(false)
      // console.log("this.ul.scrollTop after: " + this.ul.scrollTop)
      this.props.UpdateScrollTop(this.ul.scrollTop)
      // this.setState({
      //   scrollTop: this.ul.scrollTop
      // })
    } else if (selectedTop < listTop) {
      // console.log("this.ul.scrollTop before: " + this.ul.scrollTop)
      this.lis[this.props.selectedIndex].scrollIntoView(true)
      // console.log("this.ul.scrollTop after: " + this.ul.scrollTop)
      this.props.UpdateScrollTop(this.ul.scrollTop)
      // this.setState({
      //   scrollTop: this.ul.scrollTop
      // })
    }
  }

  componentDidMount() {
    console.log("setting scrollTop to " + this.state.scrollTop)
    this.ul.scrollTop = this.props.scrollTop
  }

  render() {
    console.log("render: scrollTop is " + this.state.scrollTop)

    let start = performance.now()
    let liElems: JSX.Element[] = []
    // console.log("there are " + this.props.matches.length + " matches")
    for (let i = 0; i < this.props.matches.length; i++) {
      let liContent = this.getHighlightedSpans(i)
      let hoverStyle = <style>{"#dropdownEntry" + i + ":hover {background-color: #eaeaea}"}</style>
      let selectedStyle: JSX.Element | null = null
      let li: JSX.Element
      if (i === this.props.selectedIndex) {
        selectedStyle = <style>{"#dropdownEntry" + i + "{background-color: #eaeaea}"}</style>
        li = <li ref={(result) => {results[i] = result; this.lis[i] = result}} key={i} id={"dropdownEntry" + i}
          onMouseDown={this.getAddCityFn(this.props.matches[i])} style={this.liStyle}>
          {selectedStyle}{hoverStyle}{liContent}</li>
      } else {
        li = <li ref={(result) => {results[i] = result; this.lis[i] = result}} key={i} id={"dropdownEntry" + i}
          onMouseDown={this.getAddCityFn(this.props.matches[i])} style={this.liStyle}>{hoverStyle}{liContent}</li>
      }

      liElems.push(li)
    }
    console.log("creating list took " + Math.floor(performance.now() - start) + " milliseconds.")

    return (
      <div style={this.style}>
        <style>{"#cityList::-webkit-scrollbar {width: 0px;}"}</style>
        <ul ref={(ul) => {resultList = ul; this.ul = ul}} id="cityList" style={this.ulStyle}>
          {liElems}
        </ul>
      </div>
    )
  }
}

class CentroidDisplay extends React.Component<any, any> {
  constructor() {
    super()

    this.state = {
      phantomState: null
    }
  }

  mapObj: any = null
  mapElem: any = null
  buttonStyle: React.CSSProperties = {
    display: "block",
    fontSize: "10px",
    padding: "3px",
    margin: "10px",
    borderRadius: "3px",
    backgroundColor: "#fff",
  }
  imgStyle: React.CSSProperties = {
    height: "50vh",
    width: "80vh",
    background: "#aacbff",
    margin: "0 auto",
    display: "block",
    border: "1px solid #444",
    borderRadius: "2px",
    // boxShadow: "0 0 5px 2.5px rgba(0, 0, 0, 0.05)",
  }
  divStyle: React.CSSProperties = {
    // width: "640px",
    display: "block",
    textAlign: "center",
    fontFamily: "monospace",
    // margin: "0 auto",
    // border: "50px solid lightgray",
    // borderRadius: "3px",
    width: "100%",
    boxSizing: "border-box",
    height: "65vh",
    background: "lightgray",
    margin: 0,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "50% 50%",
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      phantomState: null
    })
  }

  computeCentroid(): Centroid | null {
    let centroid: Centroid | null = null
    if (this.props.cities.length !== 0) {
      let latLons = this.props.cities.map((city) => [city.lat, city.lon])
      let centroidLatLon: number[] = native.computeCentroid(latLons)

      console.log("latLons is\n", latLons)
      console.log("add city: centroid is\n", centroidLatLon)

      if (centroidLatLon.length !== 0) {
        centroid = { lat: centroidLatLon[0], lon: centroidLatLon[1] }
      } else {
        centroid = { lat: null, lon: null }
      }
    }

    return centroid
  }

  getImgDimensions(width: number, height: number): {width: number, height: number} {
    let ratio = 1.6
    if (width / height > ratio) {
      return { width: Math.floor(width), height: Math.floor(width / ratio) }
    } else {
      return { width: Math.floor(height * ratio), height: Math.floor(height) }
    }
  }

  gmapCallback() {
    console.log("in gmapCallback")
  }

  componentDidMount() {
    if (this.mapObj === null) {
      console.log("initializing map")
      console.log("gmaps is", gmaps)
      this.mapObj = gmaps({
        div: '#map',
        lat: 0,
        lng: -30,
        zoom: 2,
        width: "100%",
        height: "62vh",
      });
    }
  }

  resetMap() {
    if (this.mapObj !== null) {
      this.mapObj.removeMarkers()
      this.mapObj.setCenter(0, -30)
      this.mapObj.setZoom(2)
    } else {
      console.log("mapObj null in resetMap")
    }
  }

  render() {
    let centroid: Centroid | null = this.computeCentroid()
    let centroidElem: JSX.Element | null
    let divStyle = this.divStyle
    if (centroid === null) {
      centroidElem = null
      this.resetMap()
    } else if (centroid.lat === null) {
      centroidElem = <p>not contained in one hemisphere</p>
    } else {
      if (this.mapObj !== null) {
        console.log("centering map to centroid")
        this.mapObj.removeMarkers()
        this.mapObj.setCenter(centroid.lat, centroid.lon)
        this.mapObj.setZoom(6)
        this.mapObj.addMarker({lat: centroid.lat, lng: centroid.lon})
      } else {
        console.log("mapObj is null")
      }

      // centroidElem = (
      //   <div  style={this.divStyle}>
      //     <p>({latLon})</p>
      //     <img style={this.imgStyle} src={imgUrl}/>
      //   </div>
      // )
    }

    return (
      <div id="map" style={{width: "100%", /*height: "100%"*/}} ref={(map) => this.mapElem = map}></div>
    )
  }
}

function mapStateToProps(state: any): any {
  return state
}

let App = connect(mapStateToProps)(
  class App extends React.Component<any, any> {
  render() {
    return (
      <div style={{background: "lightgray"}}>
        <CitySelection dispatch={this.props.dispatch} cities={this.props.cities}/>
        <CentroidDisplay cities={this.props.cities} centroid={this.props.centroid}/>
      </div>
    )
  }
})

interface AddCity extends Action {
  type: "ADD_CITY",
  name: string,
}
interface RemoveCity extends Action {
  type: "REMOVE_CITY",
  index: number,
}
interface AddLatLonInfo extends Action {
  type: "ADD_LATLON_INFO",
  index: number,
  lat: number,
  lon: number,
}
interface AddCentroid extends Action {
  type: "ADD_CENTROID",
  centroid: Centroid,
}
interface City {
  name: string,
  lat: number | null,
  lon: number | null,
}
interface Centroid {
  lat: number | null,
  lon: number | null,
}
type AppAction = AddCity | RemoveCity | AddLatLonInfo | AddCentroid
interface AppState {}

function reducer(state: any, action: AppAction): any {
  switch (action.type) {
    case "ADD_CITY":
      return objectAssign({}, state, { cities: [...state.cities, { name: action.name, lat: null, lon: null }] })
    case "REMOVE_CITY":
      return objectAssign({}, state, { cities: [...state.cities.slice(0, action.index), ...state.cities.slice(action.index + 1)]})
    case "ADD_LATLON_INFO":
      return objectAssign(
        {},
        state,
        {
          cities:
            [
              ...state.cities.slice(0, action.index),
              {
                name: state.cities[action.index].name,
                lat: action.lat,
                lon: action.lon
              },
              ...state.cities.slice(action.index + 1)
            ]
        })
    case "ADD_CENTROID":
      return objectAssign(
        {},
        state,
        {
          centroid: {
            lat: action.centroid.lat,
            lon: action.centroid.lon,
          }
        })
    default:
      return state
  }
}

const store = compose(applyMiddleware(logger()))(createStore)(reducer,
  {
    cities: [] as City[],
    centroid: null as Centroid | null,
  })
// const store = createStore(
//   reducer,
//   applyMiddleware(logger)
// )

function render() {
  ReactDOM.render(
    <Provider store={store}>
      <App/>
    </Provider>,
    document.getElementById('root')
  )
}
render()
