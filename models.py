from dataclasses import dataclass
from typing import Optional, List, Dict, Any

@dataclass
class University:
    id: int
    name: str
    country: str
    min_score_ib: Optional[float]
    min_score_ossd: Optional[float]
    tuition: float
    admission_rate: float
    majors: str
    source_url: str

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]):
        """Factory method to create a University instance from a database row (dict-like)."""
        return cls(
            id=row['id'],
            name=row['name'],
            country=row['country'],
            min_score_ib=row['min_score_ib'],
            min_score_ossd=row['min_score_ossd'],
            tuition=row['tuition'],
            admission_rate=row['admission_rate'],
            majors=row['majors'],
            source_url=row['source_url']
        )
    
    def get_majors_list(self) -> List[str]:
        """Parses the majors string into a list."""
        if not self.majors:
            return []
        return [m.strip() for m in self.majors.split(';') if m.strip()]

    def get_min_score(self, system: str = 'OSSD') -> Optional[float]:
        """Returns the minimum score for the specified system."""
        if system and system.strip().upper() == 'IB':
            return self.min_score_ib
        return self.min_score_ossd
