export interface IndianCity {
  city: string;
  state: string;
}

/** Display label: "City Name, State Name" */
export function formatIndianCity({ city, state }: IndianCity): string {
  return `${city}, ${state}`;
}

const CITIES_BY_STATE: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry',
    'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole', 'Chittoor',
    'Vizianagaram', 'Proddatur', 'Nandyal', 'Machilipatnam', 'Adoni', 'Tenali',
    'Hindupur', 'Bhimavaram', 'Madanapalle', 'Guntakal', 'Dharmavaram', 'Gudivada',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Tezu',
    'Roing', 'Aalo', 'Changlang', 'Khonsa', 'Seppa', 'Yingkiong', 'Namsai',
  ],
  Assam: [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur',
    'Bongaigaon', 'Dhubri', 'Diphu', 'North Lakhimpur', 'Karimganj', 'Goalpara',
    'Sivasagar', 'Golaghat', 'Barpeta', 'Mangaldoi', 'Nalbari', 'Hailakandi',
    'Kokrajhar', 'Dhemaji', 'Morigaon', 'Hojai', 'Biswanath Chariali', 'Majuli',
  ],
  Bihar: [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah',
    'Begusarai', 'Katihar', 'Munger', 'Chhapra', 'Danapur', 'Saharsa', 'Hajipur',
    'Sasaram', 'Dehri', 'Siwan', 'Motihari', 'Nawada', 'Bagaha', 'Buxar', 'Kishanganj',
  ],
  Chhattisgarh: [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Raigarh',
    'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Mahasamund', 'Chirmiri', 'Bhatapara',
  ],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem'],
  Gujarat: [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh',
    'Gandhinagar', 'Anand', 'Nadiad', 'Morbi', 'Mehsana', 'Bharuch', 'Vapi', 'Navsari',
    'Veraval', 'Porbandar', 'Godhra', 'Palanpur', 'Bhuj', 'Surendranagar', 'Gandhidham',
  ],
  Haryana: [
    'Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar',
    'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind',
    'Kaithal', 'Rewari', 'Palwal', 'Kurukshetra', 'Narnaul',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Palampur', 'Baddi', 'Nahan',
    'Una', 'Kullu', 'Hamirpur', 'Chamba', 'Manali', 'Dalhousie', 'Kangra',
  ],
  Jharkhand: [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Phusro',
    'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chirkunda', 'Dumka', 'Chaibasa',
  ],
  Karnataka: [
    'Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Davanagere',
    'Ballari', 'Tumakuru', 'Shivamogga', 'Raichur', 'Bidar', 'Hospet', 'Hassan',
    'Gadag', 'Udupi', 'Chitradurga', 'Bagalkot', 'Karwar', 'Mandya', 'Chikkamagaluru',
  ],
  Kerala: [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad',
    'Alappuzha', 'Malappuram', 'Kannur', 'Kottayam', 'Kasaragod', 'Pathanamthitta',
    'Idukki', 'Wayanad', 'Ernakulam', 'Thalassery', 'Ponnani', 'Vatakara',
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna',
    'Ratlam', 'Rewa', 'Murwara', 'Singrauli', 'Burhanpur', 'Khandwa', 'Bhind',
    'Chhindwara', 'Guna', 'Shivpuri', 'Vidisha', 'Damoh', 'Mandsaur', 'Khargone',
  ],
  Maharashtra: [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur',
    'Amravati', 'Navi Mumbai', 'Sangli', 'Malegaon', 'Jalgaon', 'Akola', 'Latur',
    'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Nanded',
    'Satara', 'Ratnagiri', 'Panvel', 'Ulhasnagar', 'Bhiwandi', 'Wardha', 'Yavatmal',
  ],
  Manipur: [
    'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Ukhrul', 'Senapati',
  ],
  Meghalaya: [
    'Shillong', 'Tura', 'Nongstoin', 'Jowai', 'Baghmara', 'Williamnagar', 'Nongpoh',
  ],
  Mizoram: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Saiha', 'Lawngtlai'],
  Nagaland: [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek',
  ],
  Odisha: [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore',
    'Bhadrak', 'Baripada', 'Jharsuguda', 'Angul', 'Bargarh', 'Jeypore', 'Paradip',
  ],
  Punjab: [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot',
    'Hoshiarpur', 'Moga', 'Abohar', 'Malerkotla', 'Khanna', 'Phagwara', 'Barnala',
    'Firozpur', 'Kapurthala', 'Sangrur', 'Faridkot', 'Gurdaspur', 'Nawanshahr',
  ],
  Rajasthan: [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar',
    'Bharatpur', 'Sikar', 'Pali', 'Sri Ganganagar', 'Tonk', 'Kishangarh', 'Beawar',
    'Hanumangarh', 'Churu', 'Barmer', 'Nagaur', 'Chittorgarh', 'Bundi', 'Jhunjhunu',
  ],
  Sikkim: ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Jorethang'],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
    'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet',
    'Sivakasi', 'Karur', 'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram',
    'Cuddalore', 'Kumbakonam', 'Tiruvannamalai', 'Pollachi', 'Rajapalayam',
  ],
  Telangana: [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam',
    'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Miryalaguda', 'Siddipet',
    'Jagtial', 'Mancherial', 'Secunderabad',
  ],
  Tripura: [
    'Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia', 'Ambassa', 'Khowai',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj',
    'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad',
    'Jhansi', 'Muzaffarnagar', 'Mathura', 'Rampur', 'Shahjahanpur', 'Farrukhabad',
    'Ayodhya', 'Mau', 'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal',
    'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai', 'Sitapur', 'Bahraich',
    'Modinagar', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Hathras', 'Banda', 'Pilibhit',
  ],
  Uttarakhand: [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh',
    'Nainital', 'Ramnagar', 'Pithoragarh', 'Almora', 'Mussoorie', 'Kotdwar', 'Tehri',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda',
    'Kharagpur', 'Haldia', 'Raiganj', 'Krishnanagar', 'Baharampur', 'Balurghat',
    'Jalpaiguri', 'Chandannagar', 'Darjeeling', 'Cooch Behar', 'Bankura', 'Purulia',
  ],
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Mayabunder', 'Rangat'],
  Chandigarh: ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  Delhi: [
    'New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh', 'Connaught Place',
    'Najafgarh', 'Pitampura', 'Janakpuri',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua', 'Sopore',
    'Pulwama', 'Rajouri', 'Poonch', 'Kupwara', 'Kulgam', 'Bandipore',
  ],
  Ladakh: ['Leh', 'Kargil', 'Nubra', 'Diskit'],
  Lakshadweep: ['Kavaratti', 'Agatti', 'Minicoy', 'Amini'],
  Puducherry: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};

export const INDIAN_CITIES: IndianCity[] = Object.entries(CITIES_BY_STATE).flatMap(
  ([state, cities]) => cities.map((city) => ({ city, state })),
);

const formattedLookup = new Map<string, IndianCity>(
  INDIAN_CITIES.map((entry) => [formatIndianCity(entry).toLowerCase(), entry]),
);

export function searchIndianCities(query: string, limit = 10): IndianCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: IndianCity[] = [];
  for (const entry of INDIAN_CITIES) {
    const label = formatIndianCity(entry).toLowerCase();
    if (label.includes(q) || entry.city.toLowerCase().includes(q)) {
      matches.push(entry);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export function parseIndianCitySelection(value: string): IndianCity | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return formattedLookup.get(trimmed.toLowerCase()) ?? null;
}

export function isValidIndianCitySelection(value: string): boolean {
  return parseIndianCitySelection(value) !== null;
}
