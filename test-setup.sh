#!/bin/bash
API="http://localhost:5085/api"

login() {
  curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"mobile\":\"$1\",\"password\":\"Admin123\"}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4
}

post() {
  curl -s -X POST "$API/$1" -H "Content-Type: application/json; charset=utf-8" -H "Authorization: Bearer $2" -d "$3"
}

get() {
  curl -s "$API/$1" -H "Authorization: Bearer $2"
}

# ═══════════════════════════════════════
# SCHOOL CONFIGS
# ═══════════════════════════════════════
SCHOOLS=(
  "0501000001|Primary"
  "0502000002|Intermediate"
  "0503000003|Secondary"
  "0504000004|Primary,Intermediate"
  "0505000005|Intermediate,Secondary"
  "0506000006|Primary,Intermediate,Secondary"
)

SCHOOL_NAMES=(
  "ابتدائية الأمل"
  "متوسطة النور"
  "ثانوية المستقبل"
  "ابتدائية ومتوسطة الإبداع"
  "متوسطة وثانوية العربين"
  "مجمع التعليم الشامل"
)

PRIMARY_GRADES='[
  {"gradeName":"الأول","isEnabled":true,"classCount":3},
  {"gradeName":"الثاني","isEnabled":true,"classCount":3},
  {"gradeName":"الثالث","isEnabled":true,"classCount":2},
  {"gradeName":"الرابع","isEnabled":true,"classCount":2},
  {"gradeName":"الخامس","isEnabled":true,"classCount":2},
  {"gradeName":"السادس","isEnabled":true,"classCount":2}
]'

INTER_GRADES='[
  {"gradeName":"الأول","isEnabled":true,"classCount":3},
  {"gradeName":"الثاني","isEnabled":true,"classCount":3},
  {"gradeName":"الثالث","isEnabled":true,"classCount":2}
]'

SEC_GRADES='[
  {"gradeName":"الأول","isEnabled":true,"classCount":3},
  {"gradeName":"الثاني","isEnabled":true,"classCount":2},
  {"gradeName":"الثالث","isEnabled":true,"classCount":2}
]'

FIRST_NAMES=("محمد" "أحمد" "عبدالله" "سعد" "فهد" "خالد" "عمر" "يوسف" "عبدالرحمن" "سلطان" "ناصر" "بندر" "تركي" "ماجد" "وليد" "إبراهيم" "صالح" "علي" "حسن" "مشعل" "نايف" "فيصل" "طلال" "سعود" "عادل" "حمد" "راشد" "منصور" "بدر" "زياد" "هشام" "أسامة" "جاسم" "مبارك" "عيسى" "داود" "كريم" "رامي" "ياسر" "أنس" "رائد" "باسل" "حاتم" "شادي" "أيمن" "لؤي" "وائل" "عماد" "ثامر" "غازي")
LAST_NAMES=("العتيبي" "الشمري" "القحطاني" "الدوسري" "المالكي" "الشهراني" "الحربي" "الغامدي" "الزهراني" "المطيري" "السبيعي" "الرشيدي" "العنزي" "البلوي" "الجهني" "الحارثي" "الأحمدي" "السلمي" "الثبيتي" "البقمي")

TEACHER_SUBJECTS=("الرياضيات" "العلوم" "اللغة العربية" "اللغة الإنجليزية" "التربية الإسلامية" "الاجتماعيات" "التربية البدنية" "الحاسب الآلي" "التربية الفنية" "المهارات الحياتية")

echo "════════════════════════════════════════"
echo "  إعداد 6 مدارس تجريبية"
echo "════════════════════════════════════════"

for idx in 0 1 2 3 4 5; do
  IFS='|' read -r PHONE STAGES_STR <<< "${SCHOOLS[$idx]}"
  SNAME="${SCHOOL_NAMES[$idx]}"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  School $((idx+1)): $SNAME"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  TOKEN=$(login "$PHONE")
  if [ -z "$TOKEN" ]; then
    echo "  ❌ Login failed!"
    continue
  fi
  echo "  ✅ Login OK"

  # Build stages JSON
  IFS=',' read -ra STAGE_ARR <<< "$STAGES_STR"
  P_ENABLED="false"; I_ENABLED="false"; S_ENABLED="false"
  P_GRADES="[]"; I_GRADES_JSON="[]"; S_GRADES_JSON="[]"
  for s in "${STAGE_ARR[@]}"; do
    case "$s" in
      Primary) P_ENABLED="true"; P_GRADES="$PRIMARY_GRADES" ;;
      Intermediate) I_ENABLED="true"; I_GRADES_JSON="$INTER_GRADES" ;;
      Secondary) S_ENABLED="true"; S_GRADES_JSON="$SEC_GRADES" ;;
    esac
  done

  STRUCTURE="{\"schoolType\":\"بنين\",\"secondarySystem\":\"فصلي\",\"confirmedDeletion\":false,\"stages\":[{\"stage\":\"Primary\",\"isEnabled\":$P_ENABLED,\"grades\":$P_GRADES},{\"stage\":\"Intermediate\",\"isEnabled\":$I_ENABLED,\"grades\":$I_GRADES_JSON},{\"stage\":\"Secondary\",\"isEnabled\":$S_ENABLED,\"grades\":$S_GRADES_JSON}]}"

  RESULT=$(post "settings/structure" "$TOKEN" "$STRUCTURE")
  echo "  Stages: $(echo "$RESULT" | grep -o '"success":[a-z]*')"

  # Create Deputies
  DEP_NUM=1
  for s in "${STAGE_ARR[@]}"; do
    DEP_PHONE="051${idx}00000${DEP_NUM}"
    DEP_NAME="${FIRST_NAMES[$((idx*3+DEP_NUM))]} ${LAST_NAMES[$((idx+DEP_NUM))]}"
    RESULT=$(post "users" "$TOKEN" "{\"name\":\"$DEP_NAME\",\"role\":\"Deputy\",\"mobile\":\"$DEP_PHONE\",\"password\":\"Deputy123\",\"scopeType\":\"stage\",\"scopeValue\":\"$s\",\"hasWhatsApp\":true,\"whatsAppPhone\":\"$DEP_PHONE\"}")
    echo "  Deputy ($s): $DEP_NAME → $(echo "$RESULT" | grep -o '"success":[a-z]*')"
    DEP_NUM=$((DEP_NUM+1))
  done

  # Add Students (50 per school, distributed across stages/grades)
  for s in "${STAGE_ARR[@]}"; do
    STUDENTS="["
    case "$s" in
      Primary) GRADE_LIST=("الأول" "الثاني" "الثالث" "الرابع" "الخامس" "السادس") ;;
      Intermediate) GRADE_LIST=("الأول" "الثاني" "الثالث") ;;
      Secondary) GRADE_LIST=("الأول" "الثاني" "الثالث") ;;
    esac

    STUDENT_COUNT=$((50 / ${#STAGE_ARR[@]}))
    for si in $(seq 0 $((STUDENT_COUNT-1))); do
      FN="${FIRST_NAMES[$((si % 50))]}"
      LN="${LAST_NAMES[$((si % 20))]}"
      GRADE="${GRADE_LIST[$((si % ${#GRADE_LIST[@]}))]}"
      CLASS="$(( (si % 3) + 1 ))"
      SNUM="$((1000 + idx*100 + si))"
      MOBILE="055${idx}${si}00000"
      [ ${#MOBILE} -gt 10 ] && MOBILE="${MOBILE:0:10}"
      [ $si -gt 0 ] && STUDENTS="$STUDENTS,"
      STUDENTS="$STUDENTS{\"studentNumber\":\"$SNUM\",\"name\":\"$FN $LN\",\"grade\":\"$GRADE\",\"className\":\"$CLASS\",\"mobile\":\"$MOBILE\"}"
    done
    STUDENTS="$STUDENTS]"

    RESULT=$(post "students/import" "$TOKEN" "{\"stage\":\"$s\",\"students\":$STUDENTS}")
    echo "  Students ($s): $STUDENT_COUNT → $(echo "$RESULT" | grep -o '"success":[a-z]*')"
  done

  # Add Teachers (50 per school)
  TEACHERS="["
  TEACHER_COUNT=$((50 / ${#STAGE_ARR[@]}))
  TOTAL_T=0
  for s in "${STAGE_ARR[@]}"; do
    case "$s" in
      Primary) GRADE_LIST=("الأول" "الثاني" "الثالث" "الرابع" "الخامس" "السادس") ;;
      Intermediate) GRADE_LIST=("الأول" "الثاني" "الثالث") ;;
      Secondary) GRADE_LIST=("الأول" "الثاني" "الثالث") ;;
    esac
    STAGE_AR=""
    case "$s" in
      Primary) STAGE_AR="Primary" ;;
      Intermediate) STAGE_AR="Intermediate" ;;
      Secondary) STAGE_AR="Secondary" ;;
    esac

    for ti in $(seq 0 $((TEACHER_COUNT-1))); do
      FN="${FIRST_NAMES[$(( (TOTAL_T+ti) % 50 ))]}"
      LN="${LAST_NAMES[$(( (TOTAL_T+ti) % 20 ))]}"
      SUBJ="${TEACHER_SUBJECTS[$(( (TOTAL_T+ti) % 10 ))]}"
      GRADE="${GRADE_LIST[$(( ti % ${#GRADE_LIST[@]} ))]}"
      CID="10${idx}000${TOTAL_T}${ti}"
      [ ${#CID} -gt 10 ] && CID="${CID:0:10}"
      TMOBILE="054${idx}${TOTAL_T}${ti}0000"
      [ ${#TMOBILE} -gt 10 ] && TMOBILE="${TMOBILE:0:10}"
      # assignedClasses format: "الأول_Primary_أ"
      CLASS_LETTER="أ"
      ASSIGNED="${GRADE}_${STAGE_AR}_${CLASS_LETTER}"
      [ $TOTAL_T -gt 0 ] && TEACHERS="$TEACHERS,"
      TEACHERS="$TEACHERS{\"civilId\":\"$CID\",\"name\":\"$FN $LN\",\"mobile\":\"$TMOBILE\",\"subjects\":\"$SUBJ\",\"assignedClasses\":\"$ASSIGNED\"}"
      TOTAL_T=$((TOTAL_T+1))
    done
  done
  TEACHERS="$TEACHERS]"

  RESULT=$(post "teachers/import" "$TOKEN" "{\"updateExisting\":false,\"teachers\":$TEACHERS}")
  echo "  Teachers: $TOTAL_T → $(echo "$RESULT" | grep -o '"success":[a-z]*')"

  echo "  ✅ School $((idx+1)) setup complete!"
done

echo ""
echo "════════════════════════════════════════"
echo "  ✅ All 6 schools setup complete!"
echo "════════════════════════════════════════"
